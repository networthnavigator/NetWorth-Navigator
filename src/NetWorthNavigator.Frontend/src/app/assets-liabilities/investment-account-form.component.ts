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
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { LedgerAccount } from '../models/ledger-account.model';
import { LedgerAccountSelectComponent } from '../components/ledger-account-select/ledger-account-select.component';
import { InvestmentAccount } from '../models/assets-liabilities.model';

const INSTRUCTIONAL_TEXT = 'Add or edit an investment account (e.g. brokerage or platform). You can optionally link it to a ledger account for reporting or double-entry.';

@Component({
  selector: 'app-investment-account-form',
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
        <h1 class="page-title">{{ isEdit ? 'Edit investment account' : 'Add investment account' }}</h1>
        <a mat-stroked-button routerLink="/assets-liabilities">Back to Assets & Liabilities</a>
      </div>
      <p class="instructional">{{ INSTRUCTIONAL_TEXT }}</p>

      <mat-card class="form-card">
        <mat-card-content>
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
            <app-ledger-account-select
              [accounts]="ledgerAccounts"
              [value]="form.ledgerAccountId"
              (valueChange)="form.ledgerAccountId = $event"
              label="Ledger account (optional)"
              placeholder="Type to filter..."
              hint="Link to a ledger account for reporting or double-entry." />
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
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 500; }
    .instructional { margin: 0 0 24px; font-size: 0.95rem; color: var(--mat-sys-on-surface-variant, #555); line-height: 1.5; }
    .form-card { padding: 24px; }
    .form { display: flex; flex-direction: column; }
    .full-width { width: 100%; }
    mat-card-actions { padding: 16px 24px; }
    .spacer { flex: 1; }
  `],
})
export class InvestmentAccountFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ledgerService = inject(LedgerService);
  private readonly service = inject(AssetsLiabilitiesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly CURRENCIES = CURRENCIES;
  readonly INSTRUCTIONAL_TEXT = INSTRUCTIONAL_TEXT;

  ledgerAccounts: LedgerAccount[] = [];
  isEdit = false;
  id: number | null = null;
  /** When editing, the loaded entity (for sortOrder etc.). */
  existingItem: InvestmentAccount | null = null;
  saving = false;

  form = {
    name: '',
    currentBalance: 0,
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
        this.service.getInvestmentAccounts().subscribe((list) => {
          const item = list.find((a) => a.id === numId);
          if (item) {
            this.existingItem = item;
            this.form = {
              name: item.name,
              currentBalance: item.currentBalance,
              currency: item.currency,
              ledgerAccountId: item.ledgerAccountId ?? null,
            };
          }
        });
      }
    }
    this.ledgerService.getAll().subscribe((list) => (this.ledgerAccounts = list));
  }

  canSave(): boolean {
    return !!this.form.name?.trim();
  }

  save(): void {
    if (!this.canSave() || this.saving) return;
    this.saving = true;
    const payload = {
      name: this.form.name.trim(),
      currentBalance: Number(this.form.currentBalance),
      currency: this.form.currency,
      ledgerAccountId: this.form.ledgerAccountId,
    };
    if (this.isEdit && this.id != null && this.existingItem) {
      this.service.updateInvestmentAccount({
        ...payload,
        id: this.id,
        sortOrder: this.existingItem.sortOrder,
      }).subscribe({
        next: () => {
          this.snackBar.open('Investment account updated', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to update', undefined, { duration: 4000 });
        },
      });
    } else {
      this.service.createInvestmentAccount(payload).subscribe({
        next: () => {
          this.snackBar.open('Investment account added', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to add', undefined, { duration: 4000 });
        },
      });
    }
  }

  deleteAccount(): void {
    if (this.id == null || !confirm('Delete this investment account?')) return;
    this.saving = true;
    this.service.deleteInvestmentAccount(this.id).subscribe({
      next: () => {
        this.snackBar.open('Investment account deleted', undefined, { duration: 2000 });
        this.router.navigate(['/assets-liabilities']);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to delete', undefined, { duration: 4000 });
      },
    });
  }
}
