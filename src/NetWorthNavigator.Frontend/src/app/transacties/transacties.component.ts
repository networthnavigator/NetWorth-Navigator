import { Component, OnInit, inject, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TransactionLinesService } from '../services/transaction-lines.service';
import { BookingsService } from '../services/bookings.service';
import { TransactionLine } from '../models/transaction-line.model';
import { BookingWithLinesDto, BookingLineDto } from '../models/booking.model';
import { getCurrencySymbol } from '../models/preferences.model';
import { forkJoin, catchError, of } from 'rxjs';
import { AddBookingLineDialogComponent, AddBookingLineDialogData } from './add-booking-line-dialog.component';

export interface TransactionsByAccount {
  ownAccount: string;
  transactions: TransactionLine[];
}

/** Normal (business) fields for the detail panel, shown first. */
const NORMAL_DETAIL_FIELDS: { key: keyof TransactionLine; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'ownAccount', label: 'Own account' },
  { key: 'contraAccount', label: 'Counterparty account' },
  { key: 'contraAccountName', label: 'Counterparty name' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'movementType', label: 'Movement type' },
  { key: 'movementTypeLabel', label: 'Movement type label' },
  { key: 'description', label: 'Description' },
  { key: 'balanceAfter', label: 'Balance after' },
  { key: 'status', label: 'Status' },
  { key: 'userComments', label: 'Comments' },
  { key: 'tag', label: 'Tag' },
];

/** Metadata (technical) fields, shown under "Metadata" header. */
const METADATA_FIELDS: { key: keyof TransactionLine; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'documentId', label: 'Document ID' },
  { key: 'originalCsvLine', label: 'Original CSV line' },
  { key: 'externalId', label: 'External ID' },
  { key: 'hash', label: 'Hash' },
  { key: 'dateCreated', label: 'Created' },
  { key: 'dateUpdated', label: 'Updated' },
  { key: 'createdByUser', label: 'Created by user' },
  { key: 'createdByProcess', label: 'Created by process' },
  { key: 'sourceName', label: 'Source' },
];

@Component({
  selector: 'app-transacties',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="transactions-page">
      <mat-card class="main-card">
        <mat-card-header>
          <mat-card-title>Bookings</mat-card-title>
          <span class="header-actions">
            <button mat-icon-button (click)="load()" matTooltip="Refresh">
              <span class="material-symbols-outlined">refresh</span>
            </button>
            <button mat-icon-button (click)="deleteAll()" matTooltip="Delete all bookings">
              <span class="material-symbols-outlined">delete_forever</span>
            </button>
          </span>
        </mat-card-header>
        <div class="toolbar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" placeholder="Search in date, account, description…">
            <span matPrefix class="material-symbols-outlined search-icon">search</span>
            @if (searchQuery) {
              <button matSuffix mat-icon-button (click)="searchQuery = ''; onSearchChange()" aria-label="Clear search">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </mat-form-field>
          <button mat-stroked-button (click)="filterPanelOpen = !filterPanelOpen" [class.active]="hasActiveFilters()">
            <span class="material-symbols-outlined">filter_list</span>
            Filter
          </button>
        </div>
        @if (filterPanelOpen) {
          <div class="filter-panel">
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>Date from</mat-label>
                <input matInput type="date" [(ngModel)]="filterDateFrom" (ngModelChange)="applyFilters()">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Date to</mat-label>
                <input matInput type="date" [(ngModel)]="filterDateTo" (ngModelChange)="applyFilters()">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Own account</mat-label>
                <mat-select [(ngModel)]="filterOwnAccount" (ngModelChange)="applyFilters()">
                  <mat-option [value]="''">— All —</mat-option>
                  @for (acc of distinctOwnAccounts(); track acc) {
                    <mat-option [value]="acc">{{ acc }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Counterparty</mat-label>
                <mat-select [(ngModel)]="filterContraName" (ngModelChange)="applyFilters()">
                  <mat-option [value]="''">— All —</mat-option>
                  @for (name of distinctContraNames(); track name) {
                    <mat-option [value]="name">{{ name || '(empty)' }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-button (click)="clearFilters()">Clear filters</button>
            </div>
          </div>
        }
        <mat-card-content>
          @if (loading) {
            <p class="loading">Loading...</p>
          } @else if (filteredGroups().length === 0) {
            <p class="empty">{{ hasActiveFilters() || searchQuery ? 'No bookings match your search or filters.' : 'No bookings yet.' }}</p>
          } @else {
            <mat-accordion class="transactions-accordion" multi>
              @for (group of filteredGroups(); track group.ownAccount) {
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <span class="panel-account mono">{{ group.ownAccount }}</span>
                    </mat-panel-title>
                    <mat-panel-description>
                      {{ group.transactions.length }} booking{{ group.transactions.length === 1 ? '' : 's' }}
                    </mat-panel-description>
                  </mat-expansion-panel-header>
                  <div class="table-wrap">
                    <table mat-table [dataSource]="group.transactions" class="transactions-table" multiTemplateDataRows>
                      <ng-container matColumnDef="expand">
                        <th mat-header-cell *matHeaderCellDef class="expand-header"></th>
                        <td mat-cell *matCellDef="let row">
                          <button mat-icon-button (click)="toggleExpanded(row); $event.stopPropagation()"
                                  [attr.aria-label]="isExpanded(row) ? 'Collapse' : 'Expand'">
                            <span class="material-symbols-outlined">{{ isExpanded(row) ? 'expand_less' : 'expand_more' }}</span>
                          </button>
                        </td>
                      </ng-container>
                      <ng-container matColumnDef="balance">
                        <th mat-header-cell *matHeaderCellDef class="balance-header"></th>
                        <td mat-cell *matCellDef="let row" class="balance-cell">
                          @let icon = getBalanceIcon(row);
                          @if (icon) {
                            <span class="material-symbols-outlined balance-icon" [class.in-balance]="icon === 'check_circle'" [class.out-of-balance]="icon === 'warning'" [attr.aria-label]="icon === 'check_circle' ? 'In balance' : 'Out of balance'" matTooltip="{{ icon === 'check_circle' ? 'In balance' : 'Out of balance' }}">{{ icon }}</span>
                          }
                        </td>
                      </ng-container>
                      <ng-container matColumnDef="review">
                        <th mat-header-cell *matHeaderCellDef class="review-header"></th>
                        <td mat-cell *matCellDef="let row" class="review-cell">
                          @let reviewIcon = getReviewIcon(row);
                          @if (reviewIcon) {
                            <span class="material-symbols-outlined review-icon" [class.review-pending]="reviewIcon === 'schedule'" [class.review-done]="reviewIcon === 'verified'" [attr.aria-label]="reviewIcon === 'verified' ? 'Reviewed' : 'Requires review'" matTooltip="{{ reviewIcon === 'verified' ? 'Reviewed' : 'Requires review' }}">{{ reviewIcon }}</span>
                          }
                        </td>
                      </ng-container>
                      <ng-container matColumnDef="date">
                        <th mat-header-cell *matHeaderCellDef>Date</th>
                        <td mat-cell *matCellDef="let row">{{ formatDate(row.date) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="contraAccountName">
                        <th mat-header-cell *matHeaderCellDef>Counterparty name</th>
                        <td mat-cell *matCellDef="let row">{{ row.contraAccountName || '—' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="description">
                        <th mat-header-cell *matHeaderCellDef>Description</th>
                        <td mat-cell *matCellDef="let row">{{ row.description || '—' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="amount">
                        <th mat-header-cell *matHeaderCellDef>Amount</th>
                        <td mat-cell *matCellDef="let row">{{ formatAmount(row.amount, row.currency) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="details">
                        <th mat-header-cell *matHeaderCellDef class="details-header"></th>
                        <td mat-cell *matCellDef="let row">
                          <button mat-icon-button (click)="openDetails(row); $event.stopPropagation()"
                                  matTooltip="Details">
                            <span class="material-symbols-outlined">info</span>
                          </button>
                        </td>
                      </ng-container>
                      <ng-container matColumnDef="expandedDetail">
                        <td mat-cell *matCellDef="let row" [attr.colspan]="displayedColumns.length" class="expanded-cell">
                          @if (isExpanded(row)) {
                            <div class="line-items-content">
                              @switch (getLineItemsState(row.id)) {
                                @case ('loading') {
                                  <p class="line-items-loading">Loading…</p>
                                }
                                @case (null) {
                                  <p class="line-items-empty">No booking lines for this transaction.</p>
                                }
                                @default {
                                  @let data = getLineItemsState(row.id);
                                  @if (data && data !== 'loading' && data.lines) {
                                    @if (data.requiresReview !== false) {
                                      <div class="review-status">
                                        @if (data.reviewedAt) {
                                          <span class="material-symbols-outlined review-icon">verified</span>
                                          Reviewed {{ formatDate(data.reviewedAt) }}
                                        } @else {
                                          <span class="material-symbols-outlined review-icon pending">schedule</span>
                                          Requires review
                                          <button mat-stroked-button (click)="markAsReviewed(row, data); $event.stopPropagation()" class="mark-reviewed-btn"
                                            [disabled]="!bookingInBalance(data.lines)"
                                            [matTooltip]="!bookingInBalance(data.lines) ? 'Booking must be in balance (debits = credits) to mark as reviewed' : null">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            Mark as reviewed
                                          </button>
                                        }
                                      </div>
                                    }
                                    <table class="line-items-table">
                                      <thead>
                                        <tr>
                                          <th>Account</th>
                                          <th>Debit</th>
                                          <th>Credit</th>
                                          <th>Currency</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        @for (line of data.lines; track line.id) {
                                          <tr>
                                            <td class="mono">{{ line.ledgerAccountCode ?? line.ledgerAccountName ?? line.ledgerAccountId }}</td>
                                            <td class="mono amount">{{ line.debitAmount > 0 ? formatAmount(line.debitAmount, line.currency) : '—' }}</td>
                                            <td class="mono amount">{{ line.creditAmount > 0 ? formatAmount(line.creditAmount, line.currency) : '—' }}</td>
                                            <td>{{ line.currency }}</td>
                                          </tr>
                                        }
                                      </tbody>
                                    </table>
                                    <div class="line-items-actions">
                                      <button mat-stroked-button (click)="openAddBookingLineDialog(row, data); $event.stopPropagation()">
                                        <span class="material-symbols-outlined">add</span>
                                        Add line
                                      </button>
                                      <button mat-stroked-button (click)="navigateToCreateRule(row, data); $event.stopPropagation()" class="create-rule-btn">
                                        <span class="material-symbols-outlined">add_circle</span>
                                        Create booking rule
                                      </button>
                                    </div>
                                  }
                                }
                              }
                            </div>
                          }
                        </td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns"
                          (click)="toggleExpanded(row)"
                          [class.row-expanded]="isExpanded(row)"
                          [class.row-selected]="isSelected(row)"
                          class="clickable-row"></tr>
                      <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>
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
            <h3>Details</h3>
            <button mat-icon-button (click)="closePanel()" aria-label="Close">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          @if (selectedTransaction) {
            <dl class="detail-fields">
              @for (f of normalDetailFields; track f.key) {
                <dt>{{ f.label }}</dt>
                <dd>{{ formatDetailValue(selectedTransaction, f.key) }}</dd>
              }
            </dl>
            <h4 class="detail-section-title">Metadata</h4>
            <dl class="detail-fields">
              @for (f of metadataFields; track f.key) {
                <dt>{{ f.label }}</dt>
                <dd class="mono">{{ formatDetailValue(selectedTransaction, f.key) }}</dd>
              }
            </dl>
          }
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .transactions-page { position: relative; min-height: 200px; }
    mat-card-header { display: flex; align-items: center; }
    .toolbar { display: flex; align-items: center; gap: 16px; padding: 0 16px 16px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 200px; max-width: 400px; }
    .search-field .search-icon { font-size: 20px; margin-right: 4px; color: var(--mat-sys-on-surface-variant, #666); }
    .toolbar button.active { background: rgba(25, 118, 210, 0.08); }
    .filter-panel { padding: 0 16px 16px; border-top: 1px solid rgba(0,0,0,0.08); margin-top: -8px; padding-top: 16px; }
    html.theme-dark .filter-panel { border-top-color: rgba(255,255,255,0.12); }
    .filter-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
    .filter-row mat-form-field { min-width: 140px; }
    .material-symbols-outlined { font-size: 24px; }
    .header-actions { margin-left: auto; }
    .loading, .empty { padding: 24px; color: #757575; }
    .transactions-accordion { margin: -16px 0; }
    .transactions-accordion .mat-mdc-expansion-panel { margin-bottom: 8px; }
    .panel-account { font-weight: 500; }
    .table-wrap { overflow-x: auto; margin-top: 8px; }
    .transactions-table { width: 100%; min-width: 400px; }
    .transactions-table th, .transactions-table td { padding: 8px 12px; }
    .transactions-table .expand-header, .transactions-table .details-header, .transactions-table .balance-header, .transactions-table .review-header { width: 48px; }
    .transactions-table .balance-cell, .transactions-table .review-cell { padding-right: 4px; }
    .transactions-table .balance-icon { font-size: 22px; }
    .transactions-table .review-icon { font-size: 22px; }
    .transactions-table .review-icon.review-pending { color: var(--mat-sys-on-surface-variant, #666); }
    .transactions-table .review-icon.review-done { color: #2e7d32; }
    html.theme-dark .transactions-table .review-icon.review-done { color: #81c784; }
    .transactions-table .balance-icon.in-balance { color: #2e7d32; }
    .transactions-table .balance-icon.out-of-balance { color: #c62828; }
    html.theme-dark .transactions-table .balance-icon.in-balance { color: #81c784; }
    html.theme-dark .transactions-table .balance-icon.out-of-balance { color: #e57373; }
    .transactions-table .expanded-cell { padding: 0; vertical-align: top; border-bottom: 1px solid rgba(0,0,0,0.12); }
    html.theme-dark .transactions-table .expanded-cell { border-bottom-color: rgba(255,255,255,0.12); }
    .detail-row { height: 0; }
    .detail-row .mat-mdc-cell { border-bottom-width: 0; }
    .line-items-content { padding: 12px 16px; background: rgba(0,0,0,0.02); }
    html.theme-dark .line-items-content { background: rgba(255,255,255,0.04); }
    .review-status { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 0.9rem; flex-wrap: wrap; }
    .review-status .review-icon { font-size: 20px; }
    .review-status .review-icon.pending { color: var(--mat-sys-on-surface-variant, #666); }
    .review-status .mark-reviewed-btn .material-symbols-outlined { font-size: 18px; vertical-align: middle; margin-right: 4px; }
    .line-items-actions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .line-items-actions button .material-symbols-outlined, .line-items-actions a .material-symbols-outlined { font-size: 18px; vertical-align: middle; margin-right: 4px; }
    .line-items-actions .create-rule-btn { color: var(--mat-sys-primary, #1976d2); }
    .line-items-loading, .line-items-empty { margin: 0; padding: 8px 0; color: var(--mat-sys-on-surface-variant, #666); font-size: 0.9rem; }
    .line-items-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .line-items-table th, .line-items-table td { padding: 6px 12px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.08); }
    .line-items-table th { font-weight: 600; color: var(--mat-sys-on-surface-variant, #666); }
    .line-items-table .amount { white-space: nowrap; }
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
    .detail-section-title { margin: 20px 0 8px; font-size: 0.9rem; font-weight: 600; color: var(--mat-sys-on-surface-variant, #666); }
    html.theme-dark .detail-section-title { color: rgba(255,255,255,0.7); }
  `],
})
export class TransactiesComponent implements OnInit {
  private readonly service = inject(TransactionLinesService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly bookingsService = inject(BookingsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly getCurrencySymbol = getCurrencySymbol;

  groups = signal<TransactionsByAccount[]>([]);
  loading = false;
  displayedColumns: string[] = ['expand', 'balance', 'review', 'date', 'contraAccountName', 'description', 'amount', 'details'];
  selectedTransaction: TransactionLine | null = null;
  readonly normalDetailFields = NORMAL_DETAIL_FIELDS;
  readonly metadataFields = METADATA_FIELDS;

  searchQuery = '';
  filterPanelOpen = false;
  filterDateFrom = '';
  filterDateTo = '';
  filterOwnAccount = '';
  filterContraName = '';

  /** Header (normal) field keys used for search – not metadata. */
  private readonly searchableKeys: (keyof TransactionLine)[] = [
    'date', 'ownAccount', 'contraAccount', 'contraAccountName', 'amount', 'currency',
    'movementType', 'movementTypeLabel', 'description', 'status', 'userComments', 'tag',
  ];

  distinctOwnAccounts = computed(() => {
    const set = new Set<string>();
    this.groups().forEach(g => set.add(g.ownAccount));
    return Array.from(set).sort();
  });
  distinctContraNames = computed(() => {
    const set = new Set<string>();
    this.groups().forEach(g => g.transactions.forEach(t => set.add(t.contraAccountName ?? '')));
    return Array.from(set).sort((a, b) => (a || '').localeCompare(b || ''));
  });

  filteredGroups = computed(() => {
    let list = this.groups();
    const q = this.searchQuery.trim().toLowerCase();
    const dateFrom = this.filterDateFrom ? new Date(this.filterDateFrom) : null;
    const dateTo = this.filterDateTo ? new Date(this.filterDateTo) : null;
    const own = this.filterOwnAccount.trim();
    const contra = this.filterContraName.trim();

    if (q || dateFrom || dateTo || own || contra) {
      list = list.map(group => {
        let transactions = group.transactions;
        if (q) {
          transactions = transactions.filter(t => this.matchesSearch(t, q));
        }
        if (dateFrom || dateTo) {
          const dateToEnd = dateTo ? new Date(dateTo) : null;
          if (dateToEnd) dateToEnd.setHours(23, 59, 59, 999);
          transactions = transactions.filter(t => {
            const d = new Date(t.date);
            if (dateFrom && d < dateFrom) return false;
            if (dateToEnd && d > dateToEnd) return false;
            return true;
          });
        }
        if (own) {
          transactions = transactions.filter(t => (t.ownAccount || '').trim() === own);
        }
        if (contra) {
          transactions = transactions.filter(t => (t.contraAccountName || '').trim() === contra);
        }
        return { ownAccount: group.ownAccount, transactions };
      }).filter(g => g.transactions.length > 0);
    }
    return list;
  });

  private matchesSearch(t: TransactionLine, q: string): boolean {
    for (const key of this.searchableKeys) {
      const v = t[key];
      if (v === undefined || v === null) continue;
      const s = typeof v === 'number' ? String(v) : String(v);
      if (s.toLowerCase().includes(q)) return true;
    }
    return false;
  }

  onSearchChange(): void {}
  applyFilters(): void {}

  hasActiveFilters(): boolean {
    return !!(this.filterDateFrom || this.filterDateTo || this.filterOwnAccount || this.filterContraName);
  }

  clearFilters(): void {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterOwnAccount = '';
    this.filterContraName = '';
  }

  /** Id of the row currently expanded for line items. */
  expandedRowId: string | null = null;
  /** Cache: document line id -> booking with lines, or 'loading', or null (no booking). */
  private lineItemsCache = new Map<string, BookingWithLinesDto | null | 'loading'>();

  toggleExpanded(row: TransactionLine): void {
    if (this.expandedRowId === row.id) {
      this.expandedRowId = null;
    } else {
      this.expandedRowId = row.id;
      const cached = this.lineItemsCache.get(row.id);
      if (cached === undefined) {
        this.lineItemsCache.set(row.id, 'loading');
        this.bookingsService.getBySourceDocumentLine(row.id).subscribe((booking) => {
          this.lineItemsCache.set(row.id, booking ?? null);
          this.cdr.markForCheck();
        });
      }
    }
  }

  isExpanded(row: TransactionLine): boolean {
    return this.expandedRowId === row.id;
  }

  getLineItemsState(rowId: string): BookingWithLinesDto | null | 'loading' | undefined {
    return this.lineItemsCache.get(rowId);
  }

  /** Returns 'check_circle' or 'warning' when booking is loaded and has lines; null otherwise. */
  getBalanceIcon(row: TransactionLine): 'check_circle' | 'warning' | null {
    const state = this.getLineItemsState(row.id);
    if (!state || state === 'loading' || !state.lines?.length) return null;
    return this.bookingInBalance(state.lines) ? 'check_circle' : 'warning';
  }

  /** Returns 'schedule' (requires review) or 'verified' (reviewed) when booking is loaded and requiresReview; null otherwise. */
  getReviewIcon(row: TransactionLine): 'schedule' | 'verified' | null {
    const state = this.getLineItemsState(row.id);
    if (!state || state === 'loading' || state.requiresReview === false) return null;
    return state.reviewedAt ? 'verified' : 'schedule';
  }

  /** True when total debits equal total credits per currency (booking is in balance). */
  bookingInBalance(lines: BookingLineDto[]): boolean {
    if (!lines?.length) return true;
    const byCurrency = new Map<string, { debit: number; credit: number }>();
    for (const l of lines) {
      const c = l.currency ?? 'EUR';
      const cur = byCurrency.get(c) ?? { debit: 0, credit: 0 };
      cur.debit += Number(l.debitAmount);
      cur.credit += Number(l.creditAmount);
      byCurrency.set(c, cur);
    }
    for (const { debit, credit } of byCurrency.values())
      if (Math.abs(debit - credit) >= 1e-6) return false;
    return true;
  }

  /** Refetch booking by source document line and update cache. */
  private refreshBookingForRow(documentLineId: string): void {
    this.lineItemsCache.set(documentLineId, 'loading');
    this.bookingsService.getBySourceDocumentLine(documentLineId).subscribe((booking) => {
      this.lineItemsCache.set(documentLineId, booking ?? null);
      this.cdr.markForCheck();
    });
  }

  openAddBookingLineDialog(row: TransactionLine, booking: BookingWithLinesDto): void {
    const ref = this.dialog.open(AddBookingLineDialogComponent, {
      data: { booking } as AddBookingLineDialogData,
      width: '420px',
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.bookingsService.addLine(booking.id, result).subscribe({
          next: () => {
            this.snackBar.open('Line added', undefined, { duration: 2000 });
            this.refreshBookingForRow(row.id);
          },
          error: (err) => {
            this.snackBar.open(err?.error?.error ?? 'Failed to add line', undefined, { duration: 4000 });
          },
        });
      }
    });
  }

  navigateToCreateRule(row: TransactionLine, _booking: BookingWithLinesDto): void {
    this.router.navigate(['/booking-rules/new'], {
      state: {
        fromBooking: {
          ownAccount: row.ownAccount ?? undefined,
          contraAccount: row.contraAccount ?? undefined,
          contraAccountName: row.contraAccountName ?? undefined,
          description: row.description ?? undefined,
          amount: row.amount,
          currency: row.currency,
          documentLineId: row.id,
        },
      },
    });
  }

  markAsReviewed(row: TransactionLine, booking: BookingWithLinesDto): void {
    this.bookingsService.markReviewed(booking.id).subscribe({
      next: () => {
        const updated = { ...booking, reviewedAt: new Date().toISOString() };
        this.lineItemsCache.set(row.id, updated);
        this.cdr.markForCheck();
        this.snackBar.open('Marked as reviewed', undefined, { duration: 2000 });
      },
      error: (err) => this.snackBar.open(err?.error?.error ?? 'Failed to mark as reviewed', undefined, { duration: 4000 }),
    });
  }

  openDetails(t: TransactionLine): void {
    this.selectedTransaction = t;
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
    forkJoin({
      lines: this.service.getAll(),
      bookings: this.bookingsService.getAll().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ lines, bookings }) => {
        this.groups.set(this.groupByOwnAccount(lines));
        this.lineItemsCache.clear();
        for (const b of bookings) {
          if (b.sourceDocumentLineId) this.lineItemsCache.set(b.sourceDocumentLineId, b);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  deleteAll() {
    if (!confirm('Delete all bookings? This cannot be undone.')) return;
    this.service.deleteAll().subscribe({
      next: (res) => {
        this.snackBar.open(`${res.deleted} booking(s) deleted`, undefined, { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.error ?? 'Failed to delete bookings', undefined, { duration: 4000 });
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
