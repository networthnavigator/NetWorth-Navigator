import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CURRENCIES } from '../models/preferences.model';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { Mortgage, AmortizationType } from '../models/assets-liabilities.model';

const INSTRUCTIONAL_TEXT = 'Add or edit a mortgage. Enter the start value, interest start date, term and rate; you can optionally enter the current balance to track extra amount paid off.';

@Component({
  selector: 'app-mortgage-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit mortgage' : 'Add mortgage' }}</h1>
        <a mat-stroked-button routerLink="/assets-liabilities">Back to Assets & Liabilities</a>
      </div>
      <p class="instructional">{{ INSTRUCTIONAL_TEXT }}</p>

      <mat-card class="form-card">
        <mat-card-content>
          <form class="form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="form.name" name="name" placeholder="e.g. Main home mortgage" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Start value</mat-label>
              <input matInput type="number" [(ngModel)]="form.startValue" name="startValue" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Interest start date</mat-label>
              <input matInput [matDatepicker]="picker" [(ngModel)]="form.interestStartDate" name="interestStartDate" required>
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker touchUi></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Term (years)</mat-label>
              <input matInput type="number" [(ngModel)]="form.termYears" name="termYears" min="1" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Current interest rate (%)</mat-label>
              <input matInput type="number" step="0.01" [(ngModel)]="form.currentInterestRate" name="currentInterestRate" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fixed-rate period (years remaining)</mat-label>
              <input matInput type="number" [(ngModel)]="form.fixedRatePeriodYears" name="fixedRatePeriodYears" min="0" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Amortization type</mat-label>
              <mat-select [(ngModel)]="form.amortizationType" name="amortizationType">
                <mat-option [value]="0">Linear</mat-option>
                <mat-option [value]="1">Annuity</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Current value (optional)</mat-label>
              <input matInput type="number" step="0.01" [(ngModel)]="form.currentValue" name="currentValue" placeholder="Leave empty for calculated value">
              <mat-hint>Enter the current mortgage balance to calculate extra amount paid off</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Currency</mat-label>
              <mat-select [(ngModel)]="form.currency" name="currency">
                @for (c of CURRENCIES; track c.code) {
                  <mat-option [value]="c.code">{{ c.name }} ({{ c.symbol }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-checkbox [(ngModel)]="form.isPaidOff" name="isPaidOff" class="full-width">
              Paid off
            </mat-checkbox>
          </form>
        </mat-card-content>
        <mat-card-actions align="end">
          @if (isEdit && id != null) {
            <button mat-button color="warn" (click)="deleteMortgage()" [disabled]="saving">Delete</button>
          }
          <span class="spacer"></span>
          <a mat-button routerLink="/assets-liabilities">Cancel</a>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave() || saving">Save</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 560px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 500; }
    .instructional { margin: 0 0 24px; font-size: 0.95rem; color: var(--mat-sys-on-surface-variant, #555); line-height: 1.5; }
    .form-card { padding: 24px; }
    .form { display: flex; flex-direction: column; }
    .full-width { width: 100%; }
    mat-card-actions { padding: 16px 24px; }
    .spacer { flex: 1; }
  `],
})
export class MortgageFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(AssetsLiabilitiesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly CURRENCIES = CURRENCIES;
  readonly INSTRUCTIONAL_TEXT = INSTRUCTIONAL_TEXT;
  readonly AmortizationType = AmortizationType;

  isEdit = false;
  id: number | null = null;
  saving = false;

  form = {
    name: '',
    startValue: 0,
    interestStartDate: null as Date | null,
    termYears: 30,
    currentInterestRate: 0,
    fixedRatePeriodYears: 0,
    amortizationType: AmortizationType.Linear,
    currentValue: null as number | null,
    isPaidOff: false,
    currency: 'EUR' as string,
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      const numId = parseInt(idParam, 10);
      if (!isNaN(numId)) {
        this.id = numId;
        this.isEdit = true;
        this.service.getMortgages().subscribe((list) => {
          const item = list.find((m) => m.id === numId);
          if (item) {
            this.form = {
              name: item.name,
              startValue: item.startValue,
              interestStartDate: new Date(item.interestStartDate),
              termYears: item.termYears,
              currentInterestRate: item.currentInterestRate,
              fixedRatePeriodYears: item.fixedRatePeriodYears,
              amortizationType: item.amortizationType ?? AmortizationType.Linear,
              currentValue: item.currentValue ?? null,
              isPaidOff: item.isPaidOff ?? false,
              currency: item.currency,
            };
          }
        });
      }
    }
  }

  canSave(): boolean {
    return !!(
      this.form.name?.trim() &&
      this.form.interestStartDate &&
      this.form.termYears >= 1 &&
      this.form.fixedRatePeriodYears >= 0
    );
  }

  private toDateOnlyString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00`;
  }

  save(): void {
    if (!this.canSave() || this.saving) return;
    this.saving = true;
    const date = this.form.interestStartDate as Date;
    const payload = {
      name: this.form.name.trim(),
      startValue: Number(this.form.startValue),
      interestStartDate: this.toDateOnlyString(date),
      termYears: Number(this.form.termYears),
      currentInterestRate: Number(this.form.currentInterestRate),
      fixedRatePeriodYears: Number(this.form.fixedRatePeriodYears),
      amortizationType: Number(this.form.amortizationType),
      currentValue: this.form.currentValue !== null && this.form.currentValue !== undefined ? Number(this.form.currentValue) : null,
      isPaidOff: this.form.isPaidOff,
      currency: this.form.currency,
    };
    if (this.isEdit && this.id != null) {
      this.service.updateMortgage({ ...payload, id: this.id } as Mortgage).subscribe({
        next: () => {
          this.snackBar.open('Mortgage updated', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to update', undefined, { duration: 4000 });
        },
      });
    } else {
      this.service.createMortgage(payload).subscribe({
        next: () => {
          this.snackBar.open('Mortgage added', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to add', undefined, { duration: 4000 });
        },
      });
    }
  }

  deleteMortgage(): void {
    if (this.id == null || !confirm('Delete this mortgage?')) return;
    this.saving = true;
    this.service.deleteMortgage(this.id).subscribe({
      next: () => {
        this.snackBar.open('Mortgage deleted', undefined, { duration: 2000 });
        this.router.navigate(['/assets-liabilities']);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to delete', undefined, { duration: 4000 });
      },
    });
  }
}
