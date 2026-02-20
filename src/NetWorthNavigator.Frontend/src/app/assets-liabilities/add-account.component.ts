import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CURRENCIES } from '../models/preferences.model';
import { LedgerService } from '../services/ledger.service';
import { TransactionLinesService } from '../services/transaction-lines.service';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { LedgerAccount } from '../models/ledger-account.model';
import { LedgerAccountSelectComponent } from '../components/ledger-account-select/ledger-account-select.component';
import { BalanceSheetAccount } from '../models/assets-liabilities.model';

const INSTRUCTIONAL_ADD = 'Add a balance-sheet account (e.g. bank or cash). Link it to a ledger account so transactions can be matched and bookings created. Optionally set an opening balance offset when your import does not cover the full history.';
const INSTRUCTIONAL_EDIT = 'Edit the account details and ledger link. Balance is calculated from your bookings; use opening balance offset when the ledger has only partial history.';

@Component({
  selector: 'app-add-account',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    LedgerAccountSelectComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit account' : 'Add account' }}</h1>
        <a mat-stroked-button routerLink="/assets-liabilities">Back to Assets & Liabilities</a>
      </div>
      <p class="instructional">{{ isEdit ? INSTRUCTIONAL_EDIT : INSTRUCTIONAL_ADD }}</p>

      <mat-card class="form-card">
        <mat-card-content>
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
              <p class="hint">Balance for this account is determined from your transactions. You can set an opening balance offset if your import does not cover the full history.</p>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Opening balance offset</mat-label>
                <input matInput type="number" [(ngModel)]="form.openingBalanceOffset" name="openingBalanceOffset" placeholder="Optional">
                <mat-hint>Balance before the first imported transaction. Pre-filled from "waarde na transactie" when available.</mat-hint>
              </mat-form-field>
            } @else {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Current balance</mat-label>
                <input matInput type="number" [(ngModel)]="form.currentBalance" name="currentBalance" required>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Opening balance offset</mat-label>
                <input matInput type="number" [(ngModel)]="form.openingBalanceOffset" name="openingBalanceOffsetEdit" placeholder="Optional">
                <mat-hint>Use when the ledger only has partial history (e.g. only last year). Displayed balance = offset + sum of bookings.</mat-hint>
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
            <app-ledger-account-select
              [accounts]="assetsLedgerAccounts"
              [value]="form.ledgerAccountId"
              (valueChange)="form.ledgerAccountId = $event"
              label="Ledger account (Assets)"
              placeholder="Type to filter..."
              [required]="true"
              [hint]="assetsLedgerAccounts.length === 0 ? 'Create at least one ledger account under Assets in Chart of accounts first.' : 'Required. Only accounts from the Assets category are shown.'" />
          </form>
        </mat-card-content>
        <mat-card-actions align="end">
          @if (isEdit && id != null) {
            <button mat-button color="warn" (click)="deleteAccount()" [disabled]="saving">Delete</button>
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
    .instructional { margin: 0 0 24px; font-size: 0.95rem; color: var(--mat-sys-on-surface-variant, #555); line-height: 1.5; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 500; }
    .form-card { padding: 24px; }
    .form { display: flex; flex-direction: column; }
    .full-width { width: 100%; }
    .hint { margin: 0 0 8px; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #555); }
    mat-card-actions { padding: 16px 24px; }
    .spacer { flex: 1; }
  `],
})
export class AddAccountComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ledgerService = inject(LedgerService);
  private readonly transactionLinesService = inject(TransactionLinesService);
  private readonly accountsService = inject(AssetsLiabilitiesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly CURRENCIES = CURRENCIES;
  readonly INSTRUCTIONAL_ADD = INSTRUCTIONAL_ADD;
  readonly INSTRUCTIONAL_EDIT = INSTRUCTIONAL_EDIT;
  assetsLedgerAccounts: LedgerAccount[] = [];
  saving = false;
  isEdit = false;
  id: number | null = null;
  /** When editing, the loaded entity (for sortOrder etc.). */
  existingItem: BalanceSheetAccount | null = null;

  /** Pre-fill name when coming from "Accounts from your transactions" (query param or state). */
  initialName: string | null = null;

  /** True when adding (not editing) an account from "Accounts from your transactions" (balance from bookings). */
  fromTransactions(): boolean {
    return !this.isEdit && !!this.initialName;
  }

  form = {
    accountNumber: '',
    name: '',
    currentBalance: 0,
    openingBalanceOffset: null as number | null,
    currency: 'EUR' as string,
    ledgerAccountId: null as number | null,
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      const numId = parseInt(idParam, 10);
      if (!isNaN(numId)) {
        this.id = numId;
        this.isEdit = true;
        this.accountsService.getAccounts().subscribe((list) => {
          const item = list.find((a) => a.id === numId);
          if (item) {
            this.existingItem = item;
            this.form = {
              accountNumber: item.accountNumber ?? '',
              name: item.name,
              currentBalance: item.currentBalance,
              openingBalanceOffset: item.openingBalanceOffset ?? null,
              currency: item.currency,
              ledgerAccountId: item.ledgerAccountId ?? null,
            };
          }
        });
      }
    } else {
      this.initialName = this.route.snapshot.queryParamMap.get('initialName') ?? null;
      this.form.name = this.initialName ?? '';
      if (this.initialName) {
        this.transactionLinesService.getSuggestedOpeningBalance(this.initialName).subscribe((v) => {
          if (v !== null && this.form.openingBalanceOffset === null) this.form.openingBalanceOffset = v;
        });
      }
    }
    this.ledgerService.getAssets().subscribe((list) => (this.assetsLedgerAccounts = list));
  }

  canSave(): boolean {
    return !!this.form.name?.trim() && !!this.form.ledgerAccountId;
  }

  save(): void {
    if (!this.canSave() || this.saving) return;
    const payload = {
      accountNumber: this.form.accountNumber?.trim() || null,
      name: this.form.name.trim(),
      currentBalance: this.fromTransactions() ? 0 : Number(this.form.currentBalance),
      openingBalanceOffset: this.form.openingBalanceOffset ?? null,
      currency: this.form.currency,
      ledgerAccountId: this.form.ledgerAccountId!,
    };
    this.saving = true;
    if (this.isEdit && this.id != null && this.existingItem) {
      const body: BalanceSheetAccount = {
        id: this.id,
        ...payload,
        sortOrder: this.existingItem.sortOrder,
      };
      this.accountsService.updateAccount(body).subscribe({
        next: () => {
          this.snackBar.open('Account updated', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to update account', undefined, { duration: 4000 });
        },
      });
    } else {
      this.accountsService.createAccount(payload).subscribe({
        next: () => {
          this.snackBar.open('Account added', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to add account', undefined, { duration: 4000 });
        },
      });
    }
  }

  deleteAccount(): void {
    if (this.id == null || !confirm('Delete this account? Bookings linked to it will remain but no longer show a balance for this account.')) return;
    this.saving = true;
    this.accountsService.deleteAccount(this.id).subscribe({
      next: () => {
        this.snackBar.open('Account deleted', undefined, { duration: 2000 });
        this.router.navigate(['/assets-liabilities']);
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err?.error?.error ?? 'Failed to delete account', undefined, { duration: 4000 });
      },
    });
  }
}
