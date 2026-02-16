import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import * as rxjs from 'rxjs';
import { BalanceSheetAccount, InvestmentAccount, Property, PropertyValuation, Mortgage, AmortizationType } from '../models/assets-liabilities.model';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { BankTransactionsHeaderService } from '../services/bank-transactions-header.service';
import { getCurrencySymbol } from '../models/preferences.model';
import { AccountEditDialogComponent, AccountEditData } from './account-edit-dialog.component';
import { InvestmentAccountEditDialogComponent, InvestmentAccountEditData } from './investment-account-edit-dialog.component';
import { PropertyEditDialogComponent, PropertyEditData } from './property-edit-dialog.component';
import { PropertyValuationsDialogComponent, PropertyValuationsDialogData } from './property-valuations-dialog.component';
import { MortgageEditDialogComponent, MortgageEditData } from './mortgage-edit-dialog.component';

@Component({
  selector: 'app-assets-liabilities',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Assets & Liabilities</h1>
        <p class="intro">Manage your assets and liabilities. This data can be used to calculate your net worth.</p>
      </div>
      <div class="header-actions">
        <button mat-stroked-button (click)="updateSeedFile()" matTooltip="Update seed file with current data">
          <span class="material-symbols-outlined">save</span>
          Update seed file
        </button>
        <button mat-stroked-button (click)="seedData()" matTooltip="Seed data from repository file">
          <span class="material-symbols-outlined">upload</span>
          Seed data
        </button>
      </div>
    </div>

    <section class="section">
      <mat-card>
        <mat-card-header>
          <mat-card-title>My accounts</mat-card-title>
          <button mat-stroked-button (click)="addAccount()">
            <span class="material-symbols-outlined">add</span>
            Add account
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="accounts()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row"><strong>Total</strong></td>
            </ng-container>
            <ng-container matColumnDef="currentBalance">
              <th mat-header-cell *matHeaderCellDef>Current balance</th>
              <td mat-cell *matCellDef="let row">{{ formatMoney(row.currentBalance, row.currency) }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row">{{ formatMoney(accountsTotal(), 'EUR') }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button (click)="editAccount(row)" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button mat-icon-button (click)="deleteAccount(row)" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
              </td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="accountColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: accountColumns"></tr>
            @if (accounts().length > 2) {
              <tr mat-footer-row *matFooterRowDef="accountColumns"></tr>
            }
            <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="3">No accounts yet. Add one to get started.</td></tr>
          </table>

          @if (ownAccountsFromTransactions().length > 0) {
            <div class="own-accounts-from-transactions">
              <h3 class="own-accounts-title">Accounts from your transactions</h3>
              <p class="own-accounts-hint">These accounts appear in your imported bank data. Add them to track balances.</p>
              <ul class="own-accounts-list">
                @for (ownAccount of ownAccountsToAdd(); track ownAccount) {
                  <li class="own-account-item">
                    <span class="own-account-name">{{ ownAccount }}</span>
                    <button mat-stroked-button color="primary" (click)="addAccount(ownAccount)">
                      <span class="material-symbols-outlined">add</span>
                      Add
                    </button>
                  </li>
                }
              </ul>
              @if (ownAccountsToAdd().length === 0 && ownAccountsFromTransactions().length > 0) {
                <p class="own-accounts-all-added">All accounts from your transactions have been added.</p>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </section>

    <section class="section">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Investment accounts</mat-card-title>
          <button mat-stroked-button (click)="addInvestmentAccount()">
            <span class="material-symbols-outlined">add</span>
            Add investment account
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="investmentAccounts()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row"><strong>Total</strong></td>
            </ng-container>
            <ng-container matColumnDef="currentBalance">
              <th mat-header-cell *matHeaderCellDef>Current balance</th>
              <td mat-cell *matCellDef="let row">{{ formatMoney(row.currentBalance, row.currency) }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row">{{ formatMoney(investmentAccountsTotal(), 'EUR') }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button (click)="editInvestmentAccount(row)" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button mat-icon-button (click)="deleteInvestmentAccount(row)" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
              </td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="investmentAccountColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: investmentAccountColumns"></tr>
            @if (investmentAccounts().length > 2) {
              <tr mat-footer-row *matFooterRowDef="investmentAccountColumns"></tr>
            }
            <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="3">No investment accounts yet. Add one to get started.</td></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </section>

    <section class="section">
      <mat-card>
        <mat-card-header>
          <mat-card-title>My properties</mat-card-title>
          <button mat-stroked-button (click)="addProperty()">
            <span class="material-symbols-outlined">add</span>
            Add property
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="properties()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row"><strong>Total</strong></td>
            </ng-container>
            <ng-container matColumnDef="purchaseDate">
              <th mat-header-cell *matHeaderCellDef>Purchase date</th>
              <td mat-cell *matCellDef="let row">{{ row.purchaseDate ? (row.purchaseDate | date:'dd-MM-yyyy') : '—' }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="purchaseValue">
              <th mat-header-cell *matHeaderCellDef>Purchase value</th>
              <td mat-cell *matCellDef="let row">{{ row.purchaseValue != null ? formatMoney(row.purchaseValue, row.currency) : '—' }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="estimatedValue">
              <th mat-header-cell *matHeaderCellDef>Estimated current value</th>
              <td mat-cell *matCellDef="let row">{{ formatMoney(calculateEstimatedPropertyValue(row.id), row.currency) }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row">{{ formatMoney(propertiesTotal(), 'EUR') }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button (click)="manageValuations(row)" matTooltip="Manage valuations"><span class="material-symbols-outlined">history</span></button>
                <button mat-icon-button (click)="editProperty(row)" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button mat-icon-button (click)="deleteProperty(row)" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
              </td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="propertyColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: propertyColumns"></tr>
            @if (properties().length > 2) {
              <tr mat-footer-row *matFooterRowDef="propertyColumns"></tr>
            }
            <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="5">No properties yet.</td></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </section>

    <section class="section">
      <mat-card>
        <mat-card-header>
          <mat-card-title>My mortgages</mat-card-title>
          <button mat-stroked-button (click)="addMortgage()">
            <span class="material-symbols-outlined">add</span>
            Add mortgage
          </button>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="mortgages()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row"><strong>Total</strong></td>
            </ng-container>
            <ng-container matColumnDef="startValue">
              <th mat-header-cell *matHeaderCellDef>Start value</th>
              <td mat-cell *matCellDef="let row">{{ formatMoney(row.startValue, row.currency) }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="interestStartDate">
              <th mat-header-cell *matHeaderCellDef>Interest start</th>
              <td mat-cell *matCellDef="let row">{{ row.interestStartDate | date:'dd-MM-yyyy' }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="termYears">
              <th mat-header-cell *matHeaderCellDef>Term (years)</th>
              <td mat-cell *matCellDef="let row">{{ row.termYears }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="currentRate">
              <th mat-header-cell *matHeaderCellDef>Current rate</th>
              <td mat-cell *matCellDef="let row">{{ row.currentInterestRate }}%</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="fixedPeriod">
              <th mat-header-cell *matHeaderCellDef>Fixed period (years)</th>
              <td mat-cell *matCellDef="let row">{{ row.fixedRatePeriodYears }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="currentValue">
              <th mat-header-cell *matHeaderCellDef>Current value</th>
              <td mat-cell *matCellDef="let row">{{ formatMoney(calculateCurrentMortgageValue(row), row.currency) }}</td>
              <td mat-footer-cell *matFooterCellDef class="total-row">{{ formatMoney(mortgagesTotal(), 'EUR') }}</td>
            </ng-container>
            <ng-container matColumnDef="extraPaidOff">
              <th mat-header-cell *matHeaderCellDef>Extra paid off</th>
              <td mat-cell *matCellDef="let row">{{ formatMoney(row.extraPaidOff || 0, row.currency) }}</td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="isPaidOff">
              <th mat-header-cell *matHeaderCellDef>Paid off</th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox [checked]="row.isPaidOff" (change)="togglePaidOff(row, $event.checked)"></mat-checkbox>
              </td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button (click)="editMortgage(row)" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></button>
                <button mat-icon-button (click)="deleteMortgage(row)" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
              </td>
              <td mat-footer-cell *matFooterCellDef></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="mortgageColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: mortgageColumns"></tr>
            @if (mortgages().length > 2) {
              <tr mat-footer-row *matFooterRowDef="mortgageColumns"></tr>
            }
            <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="10">No mortgages yet.</td></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
    .page-header > div:first-child { flex: 1; }
    .header-actions { display: flex; gap: 8px; }
    .page-title { margin: 0 0 8px; font-size: 1.5rem; font-weight: 500; }
    .intro { margin: 0; color: var(--mat-sys-on-surface-variant, #555); }
    .section { margin-bottom: 24px; }
    .section mat-card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .section mat-card-header button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .header-actions button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .full-width { width: 100%; }
    .total-row { font-weight: 500; border-top: 1px solid rgba(0,0,0,0.12); }
    html.theme-dark .total-row { border-top-color: rgba(255,255,255,0.12); }
    .own-accounts-from-transactions {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(0,0,0,0.12);
    }
    html.theme-dark .own-accounts-from-transactions { border-top-color: rgba(255,255,255,0.12); }
    .own-accounts-title { margin: 0 0 4px; font-size: 1rem; font-weight: 500; }
    .own-accounts-hint { margin: 0 0 12px; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #555); }
    html.theme-dark .own-accounts-hint { color: rgba(255,255,255,0.7); }
    .own-accounts-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .own-account-item {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 8px 12px; background: rgba(0,0,0,0.03); border-radius: 8px;
    }
    html.theme-dark .own-account-item { background: rgba(255,255,255,0.06); }
    .own-account-name { flex: 1; min-width: 0; font-family: ui-monospace, monospace; font-size: 0.9rem; }
    .own-account-item button .material-symbols-outlined { font-size: 18px; vertical-align: middle; margin-right: 4px; }
    .own-accounts-all-added { margin: 0; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #666); font-style: italic; }
    html.theme-dark .own-accounts-all-added { color: rgba(255,255,255,0.6); }
  `],
})
export class AssetsLiabilitiesComponent implements OnInit {
  private readonly service = inject(AssetsLiabilitiesService);
  private readonly bankTransactionsService = inject(BankTransactionsHeaderService);
  private readonly dialog = inject(MatDialog);

  readonly accounts = signal<BalanceSheetAccount[]>([]);
  readonly investmentAccounts = signal<InvestmentAccount[]>([]);
  readonly properties = signal<Property[]>([]);
  readonly propertyValuations = signal<Map<number, PropertyValuation[]>>(new Map());
  readonly mortgages = signal<Mortgage[]>([]);
  readonly ownAccountsFromTransactions = signal<string[]>([]);

  readonly accountsTotal = computed(() =>
    this.accounts().reduce((sum, a) => sum + a.currentBalance, 0)
  );
  /** Own accounts from transactions that are not yet in My Accounts (by name). */
  readonly ownAccountsToAdd = computed(() => {
    const existingNames = new Set(this.accounts().map(a => a.name));
    return this.ownAccountsFromTransactions().filter(name => !existingNames.has(name));
  });
  readonly investmentAccountsTotal = computed(() =>
    this.investmentAccounts().reduce((sum, a) => sum + a.currentBalance, 0)
  );
  readonly propertiesTotal = computed(() =>
    this.properties().reduce((sum, p) => sum + this.calculateEstimatedPropertyValue(p.id), 0)
  );
  readonly mortgagesTotal = computed(() =>
    this.mortgages()
      .filter(m => !m.isPaidOff)
      .reduce((sum, m) => sum + this.calculateCurrentMortgageValue(m), 0)
  );

  accountColumns = ['name', 'currentBalance', 'actions'];
  investmentAccountColumns = ['name', 'currentBalance', 'actions'];
  propertyColumns = ['name', 'purchaseDate', 'purchaseValue', 'estimatedValue', 'actions'];
  mortgageColumns = ['name', 'startValue', 'interestStartDate', 'termYears', 'currentRate', 'fixedPeriod', 'currentValue', 'extraPaidOff', 'isPaidOff', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    forkJoin({
      accounts: this.service.getAccounts(),
      investmentAccounts: this.service.getInvestmentAccounts(),
      properties: this.service.getProperties(),
      mortgages: this.service.getMortgages(),
    }).subscribe({
      next: (r) => {
        this.accounts.set(r.accounts);
        this.investmentAccounts.set(r.investmentAccounts);
        this.properties.set(r.properties);
        this.mortgages.set(r.mortgages);
        this.loadPropertyValuations(r.properties);
      },
    });
    this.bankTransactionsService.getOwnAccounts().subscribe({
      next: (list) => this.ownAccountsFromTransactions.set(list),
      error: () => this.ownAccountsFromTransactions.set([]),
    });
  }

  loadPropertyValuations(properties: Property[]): void {
    const valuationRequests = properties.map(p => 
      this.service.getPropertyValuations(p.id).pipe(
        rxjs.map(vals => ({ propertyId: p.id, valuations: vals }))
      )
    );
    if (valuationRequests.length === 0) {
      this.propertyValuations.set(new Map());
      return;
    }
    forkJoin(valuationRequests).subscribe({
      next: (results) => {
        const map = new Map<number, PropertyValuation[]>();
        results.forEach(r => map.set(r.propertyId, r.valuations));
        this.propertyValuations.set(map);
      },
    });
  }

  formatMoney(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  private interpolateValue(val1: PropertyValuation, val2: PropertyValuation, targetDate: Date): number {
    const date1 = new Date(val1.valuationDate);
    const date2 = new Date(val2.valuationDate);
    const target = targetDate.getTime();
    const time1 = date1.getTime();
    const time2 = date2.getTime();

    if (time1 === time2) return val1.value;

    const ratio = (target - time1) / (time2 - time1);
    return val1.value + (val2.value - val1.value) * ratio;
  }

  private extrapolateValue(val1: PropertyValuation, val2: PropertyValuation, targetDate: Date): number {
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

  manageValuations(property: Property): void {
    const ref = this.dialog.open(PropertyValuationsDialogComponent, {
      data: { property } as PropertyValuationsDialogData,
      width: '600px',
    });
    ref.afterClosed().subscribe(() => {
      // Reload valuations after dialog closes
      this.loadPropertyValuations(this.properties());
    });
  }

  addAccount(initialName?: string): void {
    const data: AccountEditData = initialName ? { initialName } : {};
    const ref = this.dialog.open(AccountEditDialogComponent, { data, width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.createAccount(result).subscribe(() => this.load());
    });
  }
  editAccount(row: BalanceSheetAccount): void {
    const ref = this.dialog.open(AccountEditDialogComponent, { data: { item: row } as AccountEditData, width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.updateAccount({ ...row, ...result }).subscribe(() => this.load());
    });
  }
  deleteAccount(row: BalanceSheetAccount): void {
    if (!confirm('Delete account "' + row.name + '"?')) return;
    this.service.deleteAccount(row.id).subscribe(() => this.load());
  }

  addInvestmentAccount(): void {
    const ref = this.dialog.open(InvestmentAccountEditDialogComponent, { data: {} as InvestmentAccountEditData, width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.createInvestmentAccount(result).subscribe(() => this.load());
    });
  }
  editInvestmentAccount(row: InvestmentAccount): void {
    const ref = this.dialog.open(InvestmentAccountEditDialogComponent, { data: { item: row } as InvestmentAccountEditData, width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.updateInvestmentAccount({ ...row, ...result }).subscribe(() => this.load());
    });
  }
  deleteInvestmentAccount(row: InvestmentAccount): void {
    if (!confirm('Delete investment account "' + row.name + '"?')) return;
    this.service.deleteInvestmentAccount(row.id).subscribe(() => this.load());
  }

  addProperty(): void {
    const ref = this.dialog.open(PropertyEditDialogComponent, { data: {} as PropertyEditData, width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.createProperty(result).subscribe(() => this.load());
    });
  }
  editProperty(row: Property): void {
    const ref = this.dialog.open(PropertyEditDialogComponent, { data: { item: row } as PropertyEditData, width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        const payload: Property = {
          id: row.id,
          name: result.name,
          purchaseValue: result.purchaseValue ?? null,
          purchaseDate: result.purchaseDate ?? null,
          currency: result.currency,
          sortOrder: row.sortOrder,
        };
        this.service.updateProperty(payload).subscribe(() => this.load());
      }
    });
  }
  deleteProperty(row: Property): void {
    if (!confirm('Delete property "' + row.name + '"?')) return;
    this.service.deleteProperty(row.id).subscribe(() => this.load());
  }

  addMortgage(): void {
    const ref = this.dialog.open(MortgageEditDialogComponent, { data: {} as MortgageEditData, width: '420px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.createMortgage(result).subscribe(() => this.load());
    });
  }
  editMortgage(row: Mortgage): void {
    const ref = this.dialog.open(MortgageEditDialogComponent, { data: { item: row } as MortgageEditData, width: '420px' });
    ref.afterClosed().subscribe((result) => {
      if (result) this.service.updateMortgage({ ...row, ...result }).subscribe(() => this.load());
    });
  }
  deleteMortgage(row: Mortgage): void {
    if (!confirm('Delete mortgage "' + row.name + '"?')) return;
    this.service.deleteMortgage(row.id).subscribe(() => this.load());
  }

  togglePaidOff(mortgage: Mortgage, isPaidOff: boolean | null): void {
    if (isPaidOff === null) return;
    const updated = { ...mortgage, isPaidOff };
    this.service.updateMortgage(updated).subscribe({
      next: () => {
        // Update local state immediately for better UX
        const mortgages = this.mortgages();
        const index = mortgages.findIndex(m => m.id === mortgage.id);
        if (index >= 0) {
          mortgages[index] = updated;
          this.mortgages.set([...mortgages]);
        }
      },
      error: (err) => {
        alert('Error updating mortgage: ' + (err?.error?.error || err?.message || 'Unknown error'));
        // Reload to revert UI state
        this.load();
      },
    });
  }

  updateSeedFile(): void {
    if (!confirm('This will update the seed file with your current data. Continue?')) return;
    this.service.updateSeedFile().subscribe({
      next: (result) => {
        alert('Seed file updated successfully: ' + result.path);
      },
      error: (err) => {
        alert('Error updating seed file: ' + (err?.error?.error || err?.message || 'Unknown error'));
      },
    });
  }

  seedData(): void {
    if (!confirm('This will add seed data from the repository file to your existing data. Continue?')) return;
    this.service.seed().subscribe({
      next: (result) => {
        const msg = `Seeded: ${result.accountsAdded} accounts, ${result.investmentAccountsAdded} investment accounts, ${result.propertiesAdded} properties, ${result.mortgagesAdded} mortgages.`;
        alert(msg);
        this.load();
      },
      error: (err) => {
        alert('Error seeding data: ' + (err?.error?.error || err?.message || 'Unknown error'));
      },
    });
  }
}
