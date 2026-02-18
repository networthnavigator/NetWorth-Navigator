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
import { BookingRulesService } from '../services/booking-rules.service';
import { BookingRule, MATCH_FIELDS, MATCH_OPERATORS } from '../models/booking-rule.model';

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
    <mat-card>
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
        <p class="intro"><strong>Line 1 (own account):</strong> rules with match field &quot;Own account&quot; map the transaction&#39;s own-account value (e.g. bank name from CSV) to a ledger. These are created automatically when you link an account to a ledger in Assets &amp; Liabilities.<br><strong>Line 2 (contra):</strong> other rules assign the contra ledger when the transaction matches (e.g. counterparty name contains &quot;Albert Heijn&quot; → Boodschappen).</p>
        @if (loading) {
          <p class="loading">Loading...</p>
        } @else if (rules.length === 0) {
          <p class="empty">No rules yet. Link your accounts to a ledger in Assets &amp; Liabilities to get &quot;Own account&quot; rules here. Add contra rules to auto-assign the contra ledger (e.g. counterparty contains &quot;Albert Heijn&quot; → Boodschappen).</p>
        } @else {
          <table mat-table [dataSource]="rules" class="full-width">
            <ng-container matColumnDef="line">
              <th mat-header-cell *matHeaderCellDef>Line</th>
              <td mat-cell *matCellDef="let r">{{ isOwnAccountRule(r) ? 'Own account (1)' : 'Contra (2)' }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let r">{{ r.name }}</td>
            </ng-container>
            <ng-container matColumnDef="criteria">
              <th mat-header-cell *matHeaderCellDef>Criteria</th>
              <td mat-cell *matCellDef="let r">{{ matchFieldLabel(r.matchField) }} {{ matchOperatorLabel(r.matchOperator) }} "{{ r.matchValue }}"</td>
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
                <a mat-icon-button [routerLink]="['/booking-rules/edit', r.id]" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></a>
                <button mat-icon-button (click)="deleteRule(r)" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="8">No rules</td></tr>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    mat-card-header .header-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    mat-card-header button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .intro { margin: 0 0 20px; color: var(--mat-sys-on-surface-variant, #555); font-size: 0.95rem; line-height: 1.5; }
    .full-width { width: 100%; }
    .loading, .empty { padding: 24px; color: #757575; }
  `],
})
export class BookingRulesComponent implements OnInit {
  private readonly service = inject(BookingRulesService);
  private readonly snackBar = inject(MatSnackBar);

  rules: BookingRule[] = [];
  loading = false;
  displayedColumns = ['line', 'name', 'criteria', 'ledger', 'sortOrder', 'requiresReview', 'isActive', 'actions'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (list) => {
        this.rules = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  isOwnAccountRule(r: BookingRule): boolean {
    return (r.matchField ?? '').toLowerCase() === 'ownaccount';
  }

  matchFieldLabel(id: string): string {
    return MATCH_FIELDS.find(f => f.id === id)?.label ?? id;
  }

  matchOperatorLabel(id: string): string {
    return MATCH_OPERATORS.find(o => o.id === id)?.label ?? id;
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
