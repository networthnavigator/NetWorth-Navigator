import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Mortgage, AmortizationType } from '../models/assets-liabilities.model';
import { CURRENCIES } from '../models/preferences.model';

export interface MortgageEditData {
  item?: Mortgage;
}

@Component({
  selector: 'app-mortgage-edit-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit mortgage' : 'Add mortgage' }}</h2>
    <mat-dialog-content>
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`.form { display: flex; flex-direction: column; min-width: 340px; } .full-width { width: 100%; }`],
})
export class MortgageEditDialogComponent {
  private readonly ref = inject(MatDialogRef<MortgageEditDialogComponent>);
  readonly data = inject<MortgageEditData>(MAT_DIALOG_DATA);
  readonly CURRENCIES = CURRENCIES;
  readonly AmortizationType = AmortizationType;

  form = this.data.item
    ? {
        name: this.data.item.name,
        startValue: this.data.item.startValue,
        interestStartDate: new Date(this.data.item.interestStartDate),
        termYears: this.data.item.termYears,
        currentInterestRate: this.data.item.currentInterestRate,
        fixedRatePeriodYears: this.data.item.fixedRatePeriodYears,
        amortizationType: this.data.item.amortizationType ?? AmortizationType.Linear,
        currentValue: this.data.item.currentValue ?? null,
        isPaidOff: this.data.item.isPaidOff ?? false,
        currency: this.data.item.currency,
      }
    : {
        name: '',
        startValue: 0,
        interestStartDate: null as Date | null,
        termYears: 30,
        currentInterestRate: 0,
        fixedRatePeriodYears: 0,
        amortizationType: AmortizationType.Linear,
        currentValue: null,
        isPaidOff: false,
        currency: 'EUR',
      };

  canSave(): boolean {
    return !!(
      this.form.name?.trim() &&
      this.form.interestStartDate &&
      this.form.termYears >= 1 &&
      this.form.fixedRatePeriodYears >= 0
    );
  }

  save(): void {
    if (!this.canSave()) return;
    const date = this.form.interestStartDate as Date;
    this.ref.close({
      name: this.form.name.trim(),
      startValue: Number(this.form.startValue),
      interestStartDate: date.toISOString().slice(0, 10) + 'T00:00:00',
      termYears: Number(this.form.termYears),
      currentInterestRate: Number(this.form.currentInterestRate),
      fixedRatePeriodYears: Number(this.form.fixedRatePeriodYears),
      amortizationType: Number(this.form.amortizationType),
      currentValue: this.form.currentValue !== null && this.form.currentValue !== undefined ? Number(this.form.currentValue) : null,
      isPaidOff: this.form.isPaidOff,
      currency: this.form.currency,
    });
  }
}
