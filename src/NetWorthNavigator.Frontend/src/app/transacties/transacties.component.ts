import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { TransactionLinesService } from '../services/transaction-lines.service';
import { TransactionLine } from '../models/transaction-line.model';
import { getCurrencySymbol } from '../models/preferences.model';

export interface TransactionsByAccount {
  ownAccount: string;
  transactions: TransactionLine[];
}

/** Ordered list of (database field name, label) for the detail panel. */
const DETAIL_FIELDS: { key: keyof TransactionLine; label: string }[] = [
  { key: 'id', label: 'id' },
  { key: 'date', label: 'date' },
  { key: 'ownAccount', label: 'ownAccount' },
  { key: 'contraAccount', label: 'contraAccount' },
  { key: 'contraAccountName', label: 'contraAccountName' },
  { key: 'amount', label: 'amount' },
  { key: 'currency', label: 'currency' },
  { key: 'movementType', label: 'movementType' },
  { key: 'movementTypeLabel', label: 'movementTypeLabel' },
  { key: 'description', label: 'description' },
  { key: 'balanceAfter', label: 'balanceAfter' },
  { key: 'originalCsvLine', label: 'originalCsvLine' },
  { key: 'externalId', label: 'externalId' },
  { key: 'hash', label: 'hash' },
  { key: 'dateCreated', label: 'dateCreated' },
  { key: 'dateUpdated', label: 'dateUpdated' },
  { key: 'createdByUser', label: 'createdByUser' },
  { key: 'createdByProcess', label: 'createdByProcess' },
  { key: 'sourceName', label: 'sourceName' },
  { key: 'status', label: 'status' },
  { key: 'userComments', label: 'userComments' },
  { key: 'tag', label: 'tag' },
];

@Component({
  selector: 'app-transacties',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="transactions-page">
      <mat-card class="main-card">
        <mat-card-header>
          <mat-card-title>Transactions</mat-card-title>
          <span class="header-actions">
            <button mat-icon-button (click)="load()" matTooltip="Refresh">
              <span class="material-symbols-outlined">refresh</span>
            </button>
            <button mat-icon-button (click)="deleteAll()" matTooltip="Delete all transactions">
              <span class="material-symbols-outlined">delete_forever</span>
            </button>
          </span>
        </mat-card-header>
        <mat-card-content>
          @if (loading) {
            <p class="loading">Loading...</p>
          } @else if (groups.length === 0) {
            <p class="empty">No transactions yet.</p>
          } @else {
            <mat-accordion class="transactions-accordion" multi>
              @for (group of groups; track group.ownAccount) {
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <span class="panel-account mono">{{ group.ownAccount }}</span>
                    </mat-panel-title>
                    <mat-panel-description>
                      {{ group.transactions.length }} transaction{{ group.transactions.length === 1 ? '' : 's' }}
                    </mat-panel-description>
                  </mat-expansion-panel-header>
                  <div class="table-wrap">
                    <table mat-table [dataSource]="group.transactions" class="transactions-table">
                      <ng-container matColumnDef="date">
                        <th mat-header-cell *matHeaderCellDef>Date</th>
                        <td mat-cell *matCellDef="let t">{{ formatDate(t.date) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="contraAccount">
                        <th mat-header-cell *matHeaderCellDef>Counterparty account</th>
                        <td mat-cell *matCellDef="let t" class="mono">{{ t.contraAccount || '—' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="contraAccountName">
                        <th mat-header-cell *matHeaderCellDef>Counterparty name</th>
                        <td mat-cell *matCellDef="let t">{{ t.contraAccountName || '—' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="amount">
                        <th mat-header-cell *matHeaderCellDef>Amount</th>
                        <td mat-cell *matCellDef="let t">{{ formatAmount(t.amount, t.currency) }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns"
                          (click)="onRowClick(row)"
                          [class.row-selected]="isSelected(row)"
                          class="clickable-row"></tr>
                      <tr class="mat-row" *matNoDataRow><td class="mat-cell" [attr.colspan]="displayedColumns.length">No data</td></tr>
                    </table>
                  </div>
                </mat-expansion-panel>
              }
            </mat-accordion>
          }
        </mat-card-content>
      </mat-card>

      <aside class="detail-panel" [class.open]="selectedTransaction">
        <div class="detail-panel-inner">
          <div class="detail-header">
            <h3>Transaction details</h3>
            <button mat-icon-button (click)="closePanel()" aria-label="Close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          @if (selectedTransaction) {
            <dl class="detail-fields">
              @for (f of detailFields; track f.key) {
                <dt>{{ f.label }}</dt>
                <dd>{{ formatDetailValue(selectedTransaction, f.key) }}</dd>
              }
            </dl>
          }
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .transactions-page { position: relative; min-height: 200px; }
    .main-card { margin-right: 0; transition: margin-right 0.25s ease; }
    .transactions-page:has(.detail-panel.open) .main-card { margin-right: 380px; }
    mat-card-header { display: flex; align-items: center; }
    .material-symbols-outlined { font-size: 24px; }
    .header-actions { margin-left: auto; }
    .loading, .empty { padding: 24px; color: #757575; }
    .transactions-accordion { margin: -16px 0; }
    .transactions-accordion .mat-mdc-expansion-panel { margin-bottom: 8px; }
    .panel-account { font-weight: 500; }
    .table-wrap { overflow-x: auto; margin-top: 8px; }
    .transactions-table { width: 100%; min-width: 400px; }
    .transactions-table th, .transactions-table td { padding: 8px 12px; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85em; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: rgba(0,0,0,0.04); }
    html.theme-dark .clickable-row:hover { background: rgba(255,255,255,0.06); }
    .row-selected { background: rgba(0,0,0,0.08); }
    html.theme-dark .row-selected { background: rgba(255,255,255,0.1); }

    .detail-panel {
      position: fixed; top: 0; right: 0; width: 380px; height: 100%;
      background: var(--mat-sys-surface, #fafafa);
      box-shadow: -4px 0 16px rgba(0,0,0,0.12);
      transform: translateX(100%); visibility: hidden; transition: transform 0.25s ease, visibility 0.25s;
      z-index: 100;
    }
    html.theme-dark .detail-panel { background: var(--mat-sys-surface-container, #1e1e1e); }
    .detail-panel.open { transform: translateX(0); visibility: visible; }
    .detail-panel-inner { padding: 16px; height: 100%; overflow-y: auto; }
    .detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .detail-header h3 { margin: 0; font-size: 1.1rem; font-weight: 500; }
    .detail-fields { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; align-items: baseline; }
    .detail-fields dt { margin: 0; font-weight: 500; color: var(--mat-sys-on-surface-variant, #666); font-size: 0.8rem; }
    html.theme-dark .detail-fields dt { color: rgba(255,255,255,0.7); }
    .detail-fields dd { margin: 0 0 8px; font-size: 0.9rem; word-break: break-word; }
    .detail-fields dd.mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
  `],
})
export class TransactiesComponent implements OnInit {
  private readonly service = inject(TransactionLinesService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly getCurrencySymbol = getCurrencySymbol;

  groups: TransactionsByAccount[] = [];
  loading = false;
  displayedColumns: string[] = ['date', 'contraAccount', 'contraAccountName', 'amount'];
  selectedTransaction: TransactionLine | null = null;
  readonly detailFields = DETAIL_FIELDS;

  onRowClick(t: TransactionLine): void {
    if (this.selectedTransaction?.id === t.id) {
      this.selectedTransaction = null;
    } else {
      this.selectedTransaction = t;
    }
  }

  isSelected(t: TransactionLine): boolean {
    return this.selectedTransaction?.id === t.id;
  }

  closePanel(): void {
    this.selectedTransaction = null;
  }

  formatDetailValue(t: TransactionLine, key: keyof TransactionLine): string {
    const v = t[key];
    if (v === undefined || v === null || v === '') return '—';
    if (key === 'date' || key === 'dateCreated' || key === 'dateUpdated') {
      const d = new Date(v as string);
      return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (key === 'amount' || key === 'balanceAfter') {
      const sym = getCurrencySymbol(t.currency);
      return sym + Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(v);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.groups = this.groupByOwnAccount(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  deleteAll() {
    if (!confirm('Delete all transactions? This cannot be undone.')) return;
    this.service.deleteAll().subscribe({
      next: (res) => {
        this.snackBar.open(`${res.deleted} transaction(s) deleted`, undefined, { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.error ?? 'Failed to delete transactions', undefined, { duration: 4000 });
      },
    });
  }

  private groupByOwnAccount(transactions: TransactionLine[]): TransactionsByAccount[] {
    const map = new Map<string, TransactionLine[]>();
    for (const t of transactions) {
      const key = t.ownAccount || '(unknown)';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries())
      .map(([ownAccount, list]) => ({ ownAccount, transactions: list }))
      .sort((a, b) => a.ownAccount.localeCompare(b.ownAccount));
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatAmount(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  truncate(s: string | null | undefined, max: number): string {
    if (s == null || s === '') return '';
    return s.length <= max ? s : s.slice(0, max) + '…';
  }
}
