import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BalanceSheetAccount } from '../models/assets-liabilities.model';
import { CURRENCIES } from '../models/preferences.model';
import { LedgerService } from '../services/ledger.service';
import { LedgerAccount } from '../models/ledger-account.model';

export interface AccountEditData {
  item?: BalanceSheetAccount;
  /** Pre-fill name when adding (e.g. from transaction OwnAccount). When set, balance is derived from transactions so no current balance is asked. */
  initialName?: string;
}

@Component({
  selector: 'app-account-edit-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit account' : 'Add account' }}</h2>
    <mat-dialog-content>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Account number</mat-label>
          <input matInput [(ngModel)]="form.accountNumber" name="accountNumber" placeholder="e.g. IBAN">
          <mat-hint>Optional. Leave empty for cash pots.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name" name="name" required>
        </mat-form-field>
        @if (fromTransactions()) {
          <p class="hint">Balance for this account is determined from your transactions. No need to enter a current balance.</p>
        } @else {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Current balance</mat-label>
            <input matInput type="number" [(ngModel)]="form.currentBalance" name="currentBalance" required>
          </mat-form-field>
        }
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Currency</mat-label>
          <mat-select [(ngModel)]="form.currency" name="currency">
            @for (c of CURRENCIES; track c.code) {
              <mat-option [value]="c.code">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ledger account (Assets)</mat-label>
          <mat-select [(ngModel)]="form.ledgerAccountId" name="ledgerAccountId" required>
            @if (assetsLedgerAccounts.length === 0) {
              <mat-option [value]="null" disabled>— No ledger accounts yet —</mat-option>
            } @else {
              @for (la of assetsLedgerAccounts; track la.id) {
                <mat-option [value]="la.id">{{ la.code }} {{ la.name }}</mat-option>
              }
            }
          </mat-select>
          @if (assetsLedgerAccounts.length === 0) {
            <mat-hint>Create at least one ledger account under Assets in Chart of accounts first.</mat-hint>
          } @else {
            <mat-hint>Required. Only accounts from the Assets category are shown.</mat-hint>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; min-width: 320px; }
    .full-width { width: 100%; }
    .hint { margin: 0 0 8px; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #555); }
  `],
})
export class AccountEditDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<AccountEditDialogComponent>);
  private readonly ledgerService = inject(LedgerService);
  readonly data = inject<AccountEditData>(MAT_DIALOG_DATA);
  readonly CURRENCIES = CURRENCIES;

  assetsLedgerAccounts: LedgerAccount[] = [];

  /** True when adding an account from "Accounts from your transactions" (balance from bookings). */
  fromTransactions(): boolean {
    return !this.data.item && !!this.data.initialName;
  }

  form = this.data.item
    ? {
        accountNumber: this.data.item.accountNumber ?? '',
        name: this.data.item.name,
        currentBalance: this.data.item.currentBalance,
        currency: this.data.item.currency,
        ledgerAccountId: this.data.item.ledgerAccountId ?? null,
      }
    : {
        accountNumber: '',
        name: this.data.initialName ?? '',
        currentBalance: 0,
        currency: 'EUR',
        ledgerAccountId: null as number | null,
      };

  ngOnInit(): void {
    this.ledgerService.getAssets().subscribe((list) => (this.assetsLedgerAccounts = list));
  }

  canSave(): boolean {
    return !!this.form.name?.trim() && !!this.form.ledgerAccountId;
  }

  save(): void {
    this.ref.close({
      accountNumber: this.form.accountNumber?.trim() || null,
      name: this.form.name.trim(),
      currentBalance: this.fromTransactions() ? 0 : Number(this.form.currentBalance),
      currency: this.form.currency,
      ledgerAccountId: this.form.ledgerAccountId ?? null,
    });
  }
}
