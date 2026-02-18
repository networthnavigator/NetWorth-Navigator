import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { BookingWithLinesDto } from '../models/booking.model';
import { LedgerService } from '../services/ledger.service';
import { LedgerAccount } from '../models/ledger-account.model';

export interface AddBookingLineDialogData {
  booking: BookingWithLinesDto;
}

type Side = 'debit' | 'credit';

@Component({
  selector: 'app-add-booking-line-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
  ],
  template: `
    <h2 mat-dialog-title>Add booking line</h2>
    <mat-dialog-content>
      <p class="hint">Amount is pre-filled to balance the booking (total debits = total credits).</p>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ledger account</mat-label>
          <mat-select [(ngModel)]="form.ledgerAccountId" name="ledgerAccountId" required>
            <mat-option [value]="null">— Select —</mat-option>
            @for (la of ledgerAccounts; track la.id) {
              <mat-option [value]="la.id">{{ la.code }} {{ la.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="side-field">
          <mat-label>Side</mat-label>
          <mat-select [(ngModel)]="form.side" name="side" (ngModelChange)="onSideChange()">
            <mat-option value="debit">Debit</mat-option>
            <mat-option value="credit">Credit</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="amount-field">
          <mat-label>Amount</mat-label>
          <input matInput type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="0.01">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Currency</mat-label>
          <input matInput [value]="form.currency" readonly>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (optional)</mat-label>
          <input matInput [(ngModel)]="form.description" name="description">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">Add line</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; min-width: 360px; }
    .full-width { width: 100%; }
    .side-field { width: 140px; }
    .amount-field { width: 160px; }
    .hint { margin: 0 0 16px; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #666); }
  `],
})
export class AddBookingLineDialogComponent {
  private readonly ref = inject(MatDialogRef<AddBookingLineDialogComponent>);
  private readonly ledgerService = inject(LedgerService);
  readonly data = inject<AddBookingLineDialogData>(MAT_DIALOG_DATA);

  ledgerAccounts: LedgerAccount[] = [];

  /** Balance = total debits - total credits. If > 0, we need a credit; if < 0, we need a debit. */
  private get balanceAmount(): number {
    const lines = this.data.booking.lines ?? [];
    const debits = lines.reduce((s, l) => s + Number(l.debitAmount), 0);
    const credits = lines.reduce((s, l) => s + Number(l.creditAmount), 0);
    return debits - credits;
  }

  private get currencyFromBooking(): string {
    const first = this.data.booking.lines?.[0];
    return (first?.currency ?? 'EUR').trim() || 'EUR';
  }

  form = {
    ledgerAccountId: null as number | null,
    side: (this.balanceAmount >= 0 ? 'credit' : 'debit') as Side,
    amount: Math.abs(this.balanceAmount),
    currency: this.currencyFromBooking,
    description: '' as string,
  };

  constructor() {
    this.ledgerService.getAll().subscribe((list) => (this.ledgerAccounts = list));
  }

  onSideChange(): void {}

  canSave(): boolean {
    return this.form.ledgerAccountId != null && this.form.amount != null && Number(this.form.amount) >= 0;
  }

  save(): void {
    if (!this.canSave()) return;
    const amount = Math.abs(Number(this.form.amount));
    const debit = this.form.side === 'debit' ? amount : 0;
    const credit = this.form.side === 'credit' ? amount : 0;
    this.ref.close({
      ledgerAccountId: this.form.ledgerAccountId!,
      debitAmount: debit,
      creditAmount: credit,
      currency: this.form.currency,
      description: this.form.description?.trim() || null,
    });
  }
}
