import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Property } from '../models/assets-liabilities.model';
import { CURRENCIES } from '../models/preferences.model';

export interface PropertyEditData {
  item?: Property;
}

@Component({
  selector: 'app-property-edit-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit property' : 'Add property' }}</h2>
    <mat-dialog-content>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name" name="name" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Purchase date (optional)</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="form.purchaseDate" name="purchaseDate">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker touchUi></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Purchase value (optional)</mat-label>
          <input matInput type="number" [(ngModel)]="form.purchaseValue" name="purchaseValue">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Currency</mat-label>
          <mat-select [(ngModel)]="form.currency" name="currency">
            @for (c of CURRENCIES; track c.code) {
              <mat-option [value]="c.code">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!form.name.trim()">Save</button>
    </mat-dialog-actions>
  `,
  styles: ['.form { display: flex; flex-direction: column; min-width: 320px; } .full-width { width: 100%; }'],
})
export class PropertyEditDialogComponent {
  private readonly ref = inject(MatDialogRef<PropertyEditDialogComponent>);
  readonly data = inject<PropertyEditData>(MAT_DIALOG_DATA);
  readonly CURRENCIES = CURRENCIES;

  form = this.data.item
    ? {
        name: this.data.item.name,
        purchaseValue: this.data.item.purchaseValue ?? null as number | string | null,
        purchaseDate: this.data.item.purchaseDate ? new Date(this.data.item.purchaseDate) : null as Date | null,
        currency: this.data.item.currency,
      }
    : { name: '', purchaseValue: null as number | string | null, purchaseDate: null as Date | null, currency: 'EUR' };

  /** Format date as YYYY-MM-DD using local date only (no timezone shift). */
  private toDateOnlyString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00`;
  }

  save(): void {
    const val = this.form.purchaseValue;
    const isEmpty = val === null || val === undefined || val === '';
    const numVal = isEmpty ? null : Number(val);
    const date = this.form.purchaseDate as Date | null;
    this.ref.close({
      name: this.form.name.trim(),
      purchaseValue: (numVal !== null && isNaN(numVal)) ? null : numVal,
      purchaseDate: date ? this.toDateOnlyString(date) : null,
      currency: this.form.currency,
    });
  }
}
