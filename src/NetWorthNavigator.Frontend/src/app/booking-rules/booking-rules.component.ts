import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { BookingRulesService, RuleMatchingBookingSummary } from '../services/booking-rules.service';
import { BookingRule, BookingRuleCriterion, MATCH_FIELDS, MATCH_OPERATORS } from '../models/booking-rule.model';
import { getCurrencySymbol } from '../models/preferences.model';

@Component({
  selector: 'app-booking-rules',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    RouterLink,
  ],
  template: `
    @if (loading) {
      <p class="loading">Loading...</p>
    } @else {
      <mat-card class="user-rules-card">
        <mat-card-header>
          <mat-card-title>Automated booking rules</mat-card-title>
          <div class="header-actions">
            <button mat-stroked-button (click)="updateSeedFile()" matTooltip="Update seed file with current rules">
              <span class="material-symbols-outlined">save</span>
              Update seed file
            </button>
            <button mat-stroked-button (click)="seedData()" matTooltip="Add rules from repository seed file">
              <span class="material-symbols-outlined">upload</span>
              Seed data
            </button>
            <a mat-stroked-button routerLink="/booking-rules/new">
              <span class="material-symbols-outlined">add</span>
              Add rule
            </a>
          </div>
        </mat-card-header>
        <mat-card-content>
          <p class="page-intro">Booking rules automatically assign ledger accounts when imported transactions match criteria (e.g. counterparty name contains &quot;Albert Heijn&quot; → Boodschappen). When you create or recreate a booking from a transaction line, the first matching rule is used for the contra side. Rules listed here are the ones you can edit; read-only rules for your own bank accounts appear in the section below.</p>
          @if (userRules.length === 0) {
            <p class="empty">No rules yet. Add a rule to assign ledger accounts when transactions match (e.g. counterparty name contains &quot;Albert Heijn&quot; → Boodschappen). Own-account rules appear in the read-only section below when you link an account to a ledger in Assets &amp; Liabilities.</p>
          } @else {
            <table mat-table [dataSource]="userRules" class="full-width" multiTemplateDataRows>
              <ng-container matColumnDef="expand">
                <th mat-header-cell *matHeaderCellDef class="expand-col"></th>
                <td mat-cell *matCellDef="let r">
                  <button mat-icon-button (click)="toggleExpanded(r); $event.stopPropagation()" [attr.aria-label]="isExpanded(r) ? 'Collapse' : 'Expand'">
                    <span class="material-symbols-outlined">{{ isExpanded(r) ? 'expand_less' : 'expand_more' }}</span>
                  </button>
                </td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let r">{{ r.name }}</td>
              </ng-container>
              <ng-container matColumnDef="criteria">
                <th mat-header-cell *matHeaderCellDef>Criteria</th>
                <td mat-cell *matCellDef="let r">
                  @if (getCriteriaList(r).length > 1) {
                    @for (c of getCriteriaList(r); track c.matchField + c.matchOperator + c.matchValue) {
                      {{ matchFieldLabel(c.matchField) }} {{ matchOperatorLabel(c.matchOperator) }} "{{ c.matchValue }}"{{ !$last ? ' and ' : '' }}
                    }
                  } @else {
                    {{ matchFieldLabel(r.matchField) }} {{ matchOperatorLabel(r.matchOperator) }} "{{ r.matchValue }}"
                  }
                  @if (hasConflicts(r)) {
                    <span class="material-symbols-outlined conflict-icon" [matTooltip]="getConflictTooltip(r)">warning</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="ledger">
                <th mat-header-cell *matHeaderCellDef>Ledger</th>
                <td mat-cell *matCellDef="let r">{{ (r.ledgerAccountCode ?? '') || r.ledgerAccountName || r.ledgerAccountId }}{{ r.secondLedgerAccountId ? ' + ' + (r.secondLedgerAccountCode ?? r.secondLedgerAccountName ?? r.secondLedgerAccountId) : '' }}</td>
              </ng-container>
              <ng-container matColumnDef="sortOrder">
                <th mat-header-cell *matHeaderCellDef>Order</th>
                <td mat-cell *matCellDef="let r">{{ r.sortOrder }}</td>
              </ng-container>
              <ng-container matColumnDef="requiresReview">
                <th mat-header-cell *matHeaderCellDef>Requires review</th>
                <td mat-cell *matCellDef="let r">{{ r.requiresReview !== false ? 'Yes' : 'No' }}</td>
              </ng-container>
              <ng-container matColumnDef="isActive">
                <th mat-header-cell *matHeaderCellDef>Active</th>
                <td mat-cell *matCellDef="let r">
                  <mat-slide-toggle [checked]="r.isActive" (change)="toggleActive(r, $event.checked)"></mat-slide-toggle>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let r">
                  <a mat-icon-button [routerLink]="['/booking-rules/edit', r.id]" (click)="$event.stopPropagation()" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></a>
                  <button mat-icon-button (click)="deleteRule(r); $event.stopPropagation()" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
                </td>
              </ng-container>
              <ng-container matColumnDef="expandedDetail">
                <td mat-cell *matCellDef="let r" [attr.colspan]="displayedColumns.length" class="expanded-cell">
                  @if (isExpanded(r)) {
                    <div class="matching-bookings-wrap">
                      @switch (getMatchingBookingsState(r.id)) {
                        @case ('loading') {
                          <p class="matching-loading">Loading…</p>
                        }
                        @case (undefined) {
                          <p class="matching-loading">Loading…</p>
                        }
                        @default {
                          @let list = getMatchingBookingsState(r.id);
                          @if (!isMatchingBookingsList(list)) {
                            <p class="matching-loading">Loading…</p>
                          } @else if (list.length === 0) {
                            <p class="matching-empty">No bookings match this rule yet.</p>
                          } @else {
                            <table mat-table [dataSource]="list" class="inner-table">
                              <ng-container matColumnDef="review">
                                <th mat-header-cell *matHeaderCellDef class="review-col"></th>
                                <td mat-cell *matCellDef="let b">
                                  @if (b.requiresReview !== false) {
                                    @if (b.reviewedAt) {
                                      <span class="material-symbols-outlined review-done" matTooltip="Reviewed">verified</span>
                                    } @else {
                                      <span class="material-symbols-outlined review-pending" matTooltip="Requires review">schedule</span>
                                    }
                                  }
                                </td>
                              </ng-container>
                              <ng-container matColumnDef="date">
                                <th mat-header-cell *matHeaderCellDef>Date</th>
                                <td mat-cell *matCellDef="let b">{{ formatDate(b.date) }}</td>
                              </ng-container>
                              <ng-container matColumnDef="contraAccountName">
                                <th mat-header-cell *matHeaderCellDef>Counterparty name</th>
                                <td mat-cell *matCellDef="let b">{{ b.contraAccountName || '—' }}</td>
                              </ng-container>
                              <ng-container matColumnDef="description">
                                <th mat-header-cell *matHeaderCellDef>Description</th>
                                <td mat-cell *matCellDef="let b">{{ b.description || '—' }}</td>
                              </ng-container>
                              <ng-container matColumnDef="amount">
                                <th mat-header-cell *matHeaderCellDef>Amount</th>
                                <td mat-cell *matCellDef="let b">{{ formatAmount(b.amount, b.currency) }}</td>
                              </ng-container>
                              <tr mat-header-row *matHeaderRowDef="matchingBookingColumns"></tr>
                              <tr mat-row *matRowDef="let row; columns: matchingBookingColumns"></tr>
                              <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="5">No bookings</td></tr>
                            </table>
                          }
                        }
                      }
                    </div>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns" (click)="toggleExpanded(row)" class="clickable-row"></tr>
              <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="expandable-detail-row" [class.expandable-detail-row--open]="isExpanded(row)"></tr>
              <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="8">No rules</td></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>

      @if (systemRules.length > 0) {
        <mat-card class="system-rules-card">
          <mat-card-header>
            <mat-card-title>
              <span class="material-symbols-outlined lock-icon" matTooltip="Read-only">lock</span>
              Own-account rules (automatic)
            </mat-card-title>
            <mat-card-subtitle>Read-only. Created when you link an account to a ledger in Assets &amp; Liabilities. Not included in conflict checks.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="systemRules" class="full-width" multiTemplateDataRows>
              <ng-container matColumnDef="expand">
                <th mat-header-cell *matHeaderCellDef class="expand-col"></th>
                <td mat-cell *matCellDef="let r">
                  <button mat-icon-button (click)="toggleExpanded(r); $event.stopPropagation()" [attr.aria-label]="isExpanded(r) ? 'Collapse' : 'Expand'">
                    <span class="material-symbols-outlined">{{ isExpanded(r) ? 'expand_less' : 'expand_more' }}</span>
                  </button>
                </td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let r">{{ r.name }}</td>
              </ng-container>
              <ng-container matColumnDef="criteria">
                <th mat-header-cell *matHeaderCellDef>Criteria</th>
                <td mat-cell *matCellDef="let r">
                  {{ matchFieldLabel(r.matchField) }} {{ matchOperatorLabel(r.matchOperator) }} "{{ r.matchValue }}"
                </td>
              </ng-container>
              <ng-container matColumnDef="ledger">
                <th mat-header-cell *matHeaderCellDef>Ledger</th>
                <td mat-cell *matCellDef="let r">{{ (r.ledgerAccountCode ?? '') || r.ledgerAccountName || r.ledgerAccountId }}</td>
              </ng-container>
              <ng-container matColumnDef="isActive">
                <th mat-header-cell *matHeaderCellDef>Active</th>
                <td mat-cell *matCellDef="let r">{{ r.isActive ? 'Yes' : 'No' }}</td>
              </ng-container>
              <ng-container matColumnDef="expandedDetail">
                <td mat-cell *matCellDef="let r" [attr.colspan]="systemDisplayedColumns.length" class="expanded-cell">
                  @if (isExpanded(r)) {
                    <div class="matching-bookings-wrap">
                      @switch (getMatchingBookingsState(r.id)) {
                        @case ('loading') {
                          <p class="matching-loading">Loading…</p>
                        }
                        @case (undefined) {
                          <p class="matching-loading">Loading…</p>
                        }
                        @default {
                          @let list = getMatchingBookingsState(r.id);
                          @if (!isMatchingBookingsList(list)) {
                            <p class="matching-loading">Loading…</p>
                          } @else if (list.length === 0) {
                            <p class="matching-empty">No bookings match this rule yet.</p>
                          } @else {
                            <table mat-table [dataSource]="list" class="inner-table">
                              <ng-container matColumnDef="review">
                                <th mat-header-cell *matHeaderCellDef class="review-col"></th>
                                <td mat-cell *matCellDef="let b">
                                  @if (b.requiresReview !== false) {
                                    @if (b.reviewedAt) {
                                      <span class="material-symbols-outlined review-done" matTooltip="Reviewed">verified</span>
                                    } @else {
                                      <span class="material-symbols-outlined review-pending" matTooltip="Requires review">schedule</span>
                                    }
                                  }
                                </td>
                              </ng-container>
                              <ng-container matColumnDef="date">
                                <th mat-header-cell *matHeaderCellDef>Date</th>
                                <td mat-cell *matCellDef="let b">{{ formatDate(b.date) }}</td>
                              </ng-container>
                              <ng-container matColumnDef="contraAccountName">
                                <th mat-header-cell *matHeaderCellDef>Counterparty name</th>
                                <td mat-cell *matCellDef="let b">{{ b.contraAccountName || '—' }}</td>
                              </ng-container>
                              <ng-container matColumnDef="description">
                                <th mat-header-cell *matHeaderCellDef>Description</th>
                                <td mat-cell *matCellDef="let b">{{ b.description || '—' }}</td>
                              </ng-container>
                              <ng-container matColumnDef="amount">
                                <th mat-header-cell *matHeaderCellDef>Amount</th>
                                <td mat-cell *matCellDef="let b">{{ formatAmount(b.amount, b.currency) }}</td>
                              </ng-container>
                              <tr mat-header-row *matHeaderRowDef="matchingBookingColumns"></tr>
                              <tr mat-row *matRowDef="let row; columns: matchingBookingColumns"></tr>
                              <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="5">No bookings</td></tr>
                            </table>
                          }
                        }
                      }
                    </div>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="systemDisplayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: systemDisplayedColumns" (click)="toggleExpanded(row)" class="clickable-row"></tr>
              <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="expandable-detail-row" [class.expandable-detail-row--open]="isExpanded(row)"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    mat-card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    mat-card-header .header-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    mat-card-header button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .full-width { width: 100%; }
    .page-intro { margin: 0 0 20px; max-width: 720px; line-height: 1.5; color: var(--mat-sys-on-surface-variant, #5f5f5f); font-size: 0.95rem; }
    .loading, .empty { padding: 24px; color: #757575; }
    .conflict-icon { color: var(--mat-sys-error, #b00020); font-size: 20px; vertical-align: middle; margin-left: 4px; }
    .expand-col { width: 48px; }
    .expanded-cell { padding: 0; vertical-align: top; border-bottom: 1px solid rgba(0,0,0,0.12); }
    .matching-bookings-wrap { padding: 12px 16px; background: rgba(0,0,0,0.02); }
    .matching-loading, .matching-empty { margin: 0; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #666); }
    .inner-table { width: 100%; font-size: 0.9rem; }
    .inner-table .mat-mdc-header-cell, .inner-table .mat-mdc-cell { padding: 6px 12px; }
    .review-col { width: 40px; }
    .review-done { color: var(--mat-sys-primary, #1976d2); }
    .review-pending { color: var(--mat-sys-error, #b00020); }
    .clickable-row { cursor: pointer; }
    .expandable-detail-row:not(.expandable-detail-row--open) { min-height: 0; height: 0; }
    .expandable-detail-row:not(.expandable-detail-row--open) .mat-mdc-cell { padding: 0; min-height: 0; height: 0; overflow: hidden; border-bottom-width: 0; }
    .system-rules-card { margin-top: 16px; }
    .system-rules-card .lock-icon { font-size: 20px; vertical-align: middle; margin-right: 4px; opacity: 0.7; }
    .system-rules-card mat-card-subtitle { margin-top: 4px; }
  `],
})
export class BookingRulesComponent implements OnInit {
  private readonly service = inject(BookingRulesService);
  private readonly snackBar = inject(MatSnackBar);

  rules: BookingRule[] = [];
  loading = false;
  displayedColumns = ['expand', 'name', 'criteria', 'ledger', 'sortOrder', 'requiresReview', 'isActive', 'actions'];
  systemDisplayedColumns = ['expand', 'name', 'criteria', 'ledger', 'isActive'];

  get userRules(): BookingRule[] {
    return this.rules.filter(r => !r.isSystemGenerated);
  }

  get systemRules(): BookingRule[] {
    return this.rules.filter(r => r.isSystemGenerated);
  }
  matchingBookingColumns = ['review', 'date', 'contraAccountName', 'description', 'amount'];
  expandedRuleId: number | null = null;
  private matchingBookingsCache = new Map<number, RuleMatchingBookingSummary[] | 'loading'>();

  ngOnInit(): void {
    this.load();
  }

  toggleExpanded(rule: BookingRule): void {
    const id = rule.id;
    if (this.expandedRuleId === id) {
      this.expandedRuleId = null;
      return;
    }
    this.expandedRuleId = id;
    if (!this.matchingBookingsCache.has(id)) {
      this.matchingBookingsCache.set(id, 'loading');
      this.service.getMatchingBookings(id).subscribe({
        next: (list) => this.matchingBookingsCache.set(id, list),
        error: () => this.matchingBookingsCache.set(id, []),
      });
    }
  }

  isExpanded(rule: BookingRule): boolean {
    return this.expandedRuleId === rule.id;
  }

  getMatchingBookingsState(ruleId: number): RuleMatchingBookingSummary[] | 'loading' | undefined {
    return this.matchingBookingsCache.get(ruleId);
  }

  /** Type guard for template: true when list is RuleMatchingBookingSummary[]. */
  isMatchingBookingsList(v: RuleMatchingBookingSummary[] | 'loading' | undefined): v is RuleMatchingBookingSummary[] {
    return Array.isArray(v);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatAmount(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (list) => {
        this.rules = list;
        this.matchingBookingsCache.clear();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  matchFieldLabel(id: string): string {
    return MATCH_FIELDS.find(f => f.id === id)?.label ?? id;
  }

  matchOperatorLabel(id: string): string {
    return MATCH_OPERATORS.find(o => o.id === id)?.label ?? id;
  }

  getCriteriaList(r: BookingRule): BookingRuleCriterion[] {
    if (r.criteria && r.criteria.length > 0) return r.criteria;
    return [{ matchField: r.matchField, matchOperator: r.matchOperator, matchValue: r.matchValue }];
  }

  hasConflicts(r: BookingRule): boolean {
    return (r.conflictRuleIds?.length ?? 0) > 0;
  }

  getConflictTooltip(r: BookingRule): string {
    const ids = r.conflictRuleIds ?? [];
    if (ids.length === 0) return '';
    const names = ids.map(id => this.rules.find(x => x.id === id)?.name ?? '#' + id).filter(Boolean);
    return 'This rule shares at least one criterion with: ' + (names.join(', ') || 'other rule(s). More specific rules (more criteria) are applied first.');
  }

  toggleActive(rule: BookingRule, isActive: boolean): void {
    this.service.update(rule.id, { isActive }).subscribe({
      next: () => {
        rule.isActive = isActive;
        this.snackBar.open(isActive ? 'Rule enabled' : 'Rule disabled', undefined, { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update rule', undefined, { duration: 4000 }),
    });
  }

  deleteRule(rule: BookingRule): void {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    this.service.delete(rule.id).subscribe({
      next: () => {
        this.snackBar.open('Rule deleted', undefined, { duration: 2000 });
        this.load();
      },
      error: (err) => this.snackBar.open(err?.error?.error ?? 'Failed to delete rule', undefined, { duration: 4000 }),
    });
  }

  updateSeedFile(): void {
    if (!confirm('This will update the seed file with your current rules. Continue?')) return;
    this.service.updateSeedFile().subscribe({
      next: (result) => {
        this.snackBar.open('Seed file updated: ' + result.path, undefined, { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open('Error updating seed file: ' + (err?.error?.error || err?.message || 'Unknown error'), undefined, { duration: 5000 });
      },
    });
  }

  seedData(): void {
    if (!confirm('This will add rules from the repository seed file to your existing rules. Continue?')) return;
    this.service.seed().subscribe({
      next: (result) => {
        this.snackBar.open(`Seeded: ${result.rulesAdded} rule(s) added.`, undefined, { duration: 4000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open('Error seeding data: ' + (err?.error?.error || err?.message || 'Unknown error'), undefined, { duration: 5000 });
      },
    });
  }
}
