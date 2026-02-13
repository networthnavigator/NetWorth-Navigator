import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InvestmentAccount } from '../models/assets-liabilities.model';
import { CURRENCIES } from '../models/preferences.model';

export interface InvestmentAccountEditData {
  item?: InvestmentAccount;
}

@Component({
  selector: 'app-investment-account-edit-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit investment account' : 'Add investment account' }}</h2>
    <mat-dialog-content>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name" name="name" placeholder="e.g. ING portfolio, DeGiro account" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Current balance</mat-label>
          <input matInput type="number" [(ngModel)]="form.currentBalance" name="currentBalance" required>
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
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!form.name?.trim()">Save</button>
    </mat-dialog-actions>
  `,
  styles: ['.form { display: flex; flex-direction: column; min-width: 320px; } .full-width { width: 100%; }'],
})
export class InvestmentAccountEditDialogComponent {
  private readonly ref = inject(MatDialogRef<InvestmentAccountEditDialogComponent>);
  readonly data = inject<InvestmentAccountEditData>(MAT_DIALOG_DATA);
  readonly CURRENCIES = CURRENCIES;

  form = this.data.item
    ? { name: this.data.item.name, currentBalance: this.data.item.currentBalance, currency: this.data.item.currency }
    : { name: '', currentBalance: 0, currency: 'EUR' };

  save(): void {
    this.ref.close({
      name: this.form.name.trim(),
      currentBalance: Number(this.form.currentBalance),
      currency: this.form.currency,
    });
  }
}
