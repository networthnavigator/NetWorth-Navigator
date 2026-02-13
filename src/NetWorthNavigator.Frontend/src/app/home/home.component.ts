import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { UserPreferencesService } from '../services/user-preferences.service';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { getCurrencySymbol } from '../models/preferences.model';
import { forkJoin } from 'rxjs';
import * as rxjs from 'rxjs';
import { BalanceSheetAccount, InvestmentAccount, Property, PropertyValuation, Mortgage, AmortizationType } from '../models/assets-liabilities.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <h1 class="page-title">Home</h1>
    <section class="widgets">
      <mat-card class="widget widget-net-worth">
        <mat-card-header>
          <mat-card-title>My Net Worth</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="net-worth-value">
            {{ netWorthFormatted() }}
          </div>
          <p class="widget-hint" *ngIf="hasData()">
            Calculated from your assets & liabilities.
          </p>
          <p class="widget-hint" *ngIf="!hasData()">
            No data sources connected yet. Add accounts, investments, properties and mortgages on the Assets & Liabilities page to see your net worth.
          </p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [`
    .page-title {
      margin: 0 0 24px;
      font-size: 1.5rem;
      font-weight: 500;
    }
    .widgets {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .widget {
      min-width: 0;
    }
    .widget-net-worth .net-worth-value {
      font-size: 2rem;
      font-weight: 600;
      margin: 8px 0;
      color: var(--mat-sys-primary, #1976d2);
    }
    .widget-hint {
      margin: 12px 0 0;
      font-size: 0.9rem;
      color: var(--mat-sys-on-surface-variant, #666);
    }
    html.theme-dark .widget-hint { color: var(--mat-sys-on-surface-variant); }
  `],
})
export class HomeComponent implements OnInit {
  private readonly prefs = inject(UserPreferencesService);
  private readonly assetsLiabilitiesService = inject(AssetsLiabilitiesService);

  readonly accounts = signal<{ currentBalance: number; currency: string }[]>([]);
  readonly investmentAccounts = signal<{ currentBalance: number; currency: string }[]>([]);
  readonly properties = signal<{ id: number; purchaseValue?: number | null; currency: string }[]>([]);
  readonly propertyValuations = signal<Map<number, { valuationDate: string; value: number }[]>>(new Map());
  readonly mortgages = signal<Mortgage[]>([]);

  private readonly netWorth = computed(() => {
    // Sum all assets (accounts + investment accounts + properties)
    const accountsTotal = this.accounts().reduce((sum, a) => sum + a.currentBalance, 0);
    const investmentTotal = this.investmentAccounts().reduce((sum, a) => sum + a.currentBalance, 0);
    const propertiesTotal = this.properties().reduce((sum, p) => {
      const estimatedValue = this.calculateEstimatedPropertyValue(p.id);
      return sum + estimatedValue;
    }, 0);
    const assets = accountsTotal + investmentTotal + propertiesTotal;

    // Sum all liabilities (mortgages - calculate current value, exclude paid off)
    const liabilities = this.mortgages()
      .filter(m => !m.isPaidOff)
      .reduce((sum, m) => {
        const currentValue = this.calculateCurrentMortgageValue(m);
        return sum + currentValue;
      }, 0);

    // Net worth = Assets - Liabilities
    return assets - liabilities;
  });

  readonly hasData = computed(() => {
    return this.accounts().length > 0 || 
           this.investmentAccounts().length > 0 || 
           this.properties().length > 0 || 
           this.mortgages().length > 0;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      accounts: this.assetsLiabilitiesService.getAccounts(),
      investmentAccounts: this.assetsLiabilitiesService.getInvestmentAccounts(),
      properties: this.assetsLiabilitiesService.getProperties(),
      mortgages: this.assetsLiabilitiesService.getMortgages(),
    }).subscribe({
      next: (data) => {
        this.accounts.set(data.accounts.map(a => ({ currentBalance: a.currentBalance, currency: a.currency })));
        this.investmentAccounts.set(data.investmentAccounts.map(a => ({ currentBalance: a.currentBalance, currency: a.currency })));
        this.properties.set(data.properties.map(p => ({ id: p.id, purchaseValue: p.purchaseValue, currency: p.currency })));
        this.mortgages.set(data.mortgages);
        // Load valuations for all properties
        this.loadPropertyValuations(data.properties);
      },
      error: (err) => {
        console.error('Error loading balance sheet data:', err);
      },
    });
  }

  loadPropertyValuations(properties: Property[]): void {
    const valuationRequests = properties.map(p => 
      this.assetsLiabilitiesService.getPropertyValuations(p.id).pipe(
        rxjs.map(vals => ({ propertyId: p.id, valuations: vals }))
      )
    );
    if (valuationRequests.length === 0) {
      this.propertyValuations.set(new Map());
      return;
    }
    forkJoin(valuationRequests).subscribe({
      next: (results: { propertyId: number; valuations: PropertyValuation[] }[]) => {
        const map = new Map<number, { valuationDate: string; value: number }[]>();
        results.forEach((r: { propertyId: number; valuations: PropertyValuation[] }) => 
          map.set(r.propertyId, r.valuations.map((v: PropertyValuation) => ({ valuationDate: v.valuationDate, value: v.value })))
        );
        this.propertyValuations.set(map);
      },
    });
  }

  calculateEstimatedPropertyValue(propertyId: number): number {
    const valuations = this.propertyValuations().get(propertyId) || [];
    if (valuations.length === 0) {
      // Fallback to purchaseValue if no valuations
      const property = this.properties().find(p => p.id === propertyId);
      return property?.purchaseValue ?? 0;
    }

    const now = new Date();
    const sortedVals = [...valuations].sort((a, b) => 
      new Date(a.valuationDate).getTime() - new Date(b.valuationDate).getTime()
    );

    // If only one valuation, use it
    if (sortedVals.length === 1) {
      return sortedVals[0].value;
    }

    // Find the two valuations that bracket 'now'
    let beforeIdx = -1;
    let afterIdx = -1;
    for (let i = 0; i < sortedVals.length; i++) {
      const valDate = new Date(sortedVals[i].valuationDate);
      if (valDate <= now) {
        beforeIdx = i;
      } else if (afterIdx === -1) {
        afterIdx = i;
        break;
      }
    }

    // If now is before all valuations, use the first one
    if (beforeIdx === -1) {
      return sortedVals[0].value;
    }

    // If now is after all valuations, extrapolate from the last two
    if (afterIdx === -1) {
      const last = sortedVals[sortedVals.length - 1];
      const secondLast = sortedVals[sortedVals.length - 2];
      return this.extrapolateValue(secondLast, last, now);
    }

    // Interpolate between before and after
    return this.interpolateValue(sortedVals[beforeIdx], sortedVals[afterIdx], now);
  }

  private interpolateValue(val1: { valuationDate: string; value: number }, val2: { valuationDate: string; value: number }, targetDate: Date): number {
    const date1 = new Date(val1.valuationDate);
    const date2 = new Date(val2.valuationDate);
    const target = targetDate.getTime();
    const time1 = date1.getTime();
    const time2 = date2.getTime();

    if (time1 === time2) return val1.value;

    const ratio = (target - time1) / (time2 - time1);
    return val1.value + (val2.value - val1.value) * ratio;
  }

  private extrapolateValue(val1: { valuationDate: string; value: number }, val2: { valuationDate: string; value: number }, targetDate: Date): number {
    const date1 = new Date(val1.valuationDate);
    const date2 = new Date(val2.valuationDate);
    const target = targetDate.getTime();
    const time1 = date1.getTime();
    const time2 = date2.getTime();

    if (time1 === time2) return val2.value;

    // Calculate daily growth rate
    const daysDiff = (time2 - time1) / (1000 * 60 * 60 * 24);
    const valueDiff = val2.value - val1.value;
    const dailyGrowth = valueDiff / daysDiff;

    // Extrapolate forward
    const daysForward = (target - time2) / (1000 * 60 * 60 * 24);
    return val2.value + (dailyGrowth * daysForward);
  }

  calculateCurrentMortgageValue(mortgage: Mortgage): number {
    if (mortgage.isPaidOff) return 0;

    // If CurrentValue is manually set, use that value
    if (mortgage.currentValue !== null && mortgage.currentValue !== undefined) {
      return mortgage.currentValue;
    }

    const startDate = new Date(mortgage.interestStartDate);
    // Use first working day of next month as reference date (when mortgage payment is typically made)
    const referenceDate = this.getFirstWorkingDayOfNextMonth(new Date());
    const yearsElapsed = (referenceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const yearsRemaining = Math.max(0, mortgage.termYears - yearsElapsed);

    if (yearsRemaining <= 0) return 0;

    // Calculate normal remaining value based on amortization type
    let normalAmortization: number;
    if (mortgage.amortizationType === AmortizationType.Annuity) {
      normalAmortization = this.calculateAnnuityRemainingValue(
        mortgage.startValue,
        mortgage.currentInterestRate,
        mortgage.termYears,
        yearsElapsed
      );
    } else {
      // Linear amortization: assume equal principal payments over term
      normalAmortization = mortgage.startValue * (yearsRemaining / mortgage.termYears);
    }

    const extraPaidOff = mortgage.extraPaidOff || 0;
    const currentValue = normalAmortization - extraPaidOff;
    return Math.max(0, currentValue);
  }

  /**
   * Calculates remaining mortgage value for annuity amortization.
   */
  private calculateAnnuityRemainingValue(startValue: number, annualInterestRate: number, termYears: number, yearsElapsed: number): number {
    if (yearsElapsed <= 0) return startValue;
    if (yearsElapsed >= termYears) return 0;

    const monthlyRate = (annualInterestRate / 100) / 12;
    const totalMonths = termYears * 12;
    const monthsElapsed = Math.floor(yearsElapsed * 12);

    if (monthlyRate === 0) {
      // If no interest, it's effectively linear
      return startValue * ((termYears - yearsElapsed) / termYears);
    }

    // Calculate monthly payment: P * (r * (1+r)^n) / ((1+r)^n - 1)
    const monthlyPayment = startValue * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

    // Calculate remaining balance after monthsElapsed: P * (1+r)^t - Payment * (((1+r)^t - 1) / r)
    const remainingBalance = startValue * Math.pow(1 + monthlyRate, monthsElapsed) - monthlyPayment * ((Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);

    return Math.max(0, remainingBalance);
  }

  /**
   * Gets the first working day (Monday-Friday) of the next month.
   * This is used as the reference date for mortgage calculations since payments are typically made on the first working day of the next month.
   */
  private getFirstWorkingDayOfNextMonth(date: Date): Date {
    const firstDayOfNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    // Find first working day (skip weekends)
    while (firstDayOfNextMonth.getDay() === 0 || firstDayOfNextMonth.getDay() === 6) {
      firstDayOfNextMonth.setDate(firstDayOfNextMonth.getDate() + 1);
    }
    return firstDayOfNextMonth;
  }

  readonly netWorthFormatted = computed(() => {
    const value = this.netWorth();
    const currency = this.prefs.defaultCurrency();
    const symbol = getCurrencySymbol(currency);
    return value === 0
      ? `${symbol}0.00`
      : `${symbol}${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });
}
