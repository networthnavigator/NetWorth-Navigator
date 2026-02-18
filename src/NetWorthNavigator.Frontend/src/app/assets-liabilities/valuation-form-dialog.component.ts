import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Property, PropertyValuation } from '../models/assets-liabilities.model';

export interface ValuationFormDialogData {
  property: Property;
  /** When set, dialog is in edit mode. */
  existing?: PropertyValuation;
}

@Component({
  selector: 'app-valuation-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.existing ? 'Edit valuation' : 'Add valuation' }}</h2>
    <mat-dialog-content>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="form.valuationDate" name="valuationDate" required>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker touchUi></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Value ({{ data.property.currency }})</mat-label>
          <input matInput type="number" [(ngModel)]="form.value" name="value" required min="0" step="0.01">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: ['.form { display: flex; flex-direction: column; min-width: 320px; } .full-width { width: 100%; }'],
})
export class ValuationFormDialogComponent {
  private readonly ref = inject(MatDialogRef<ValuationFormDialogComponent>);
  readonly data = inject<ValuationFormDialogData>(MAT_DIALOG_DATA);

  form = this.data.existing
    ? {
        valuationDate: new Date(this.data.existing.valuationDate),
        value: this.data.existing.value,
      }
    : {
        valuationDate: new Date() as Date,
        value: 0 as number,
      };

  canSave(): boolean {
    return this.form.valuationDate != null && this.form.value != null && !isNaN(Number(this.form.value));
  }

  /** Format date as YYYY-MM-DD using local date only (no timezone shift). */
  private toDateOnlyString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00`;
  }

  save(): void {
    if (!this.canSave()) return;
    const date = this.form.valuationDate as Date;
    const value = Number(this.form.value);
    const dateStr = this.toDateOnlyString(date);
    if (this.data.existing) {
      this.ref.close({
        ...this.data.existing,
        valuationDate: dateStr,
        value,
      });
    } else {
      this.ref.close({
        valuationDate: dateStr,
        value,
      });
    }
  }
}
