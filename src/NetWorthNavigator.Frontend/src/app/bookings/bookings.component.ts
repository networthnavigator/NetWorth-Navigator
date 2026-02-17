import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { BookingsService } from '../services/bookings.service';
import { BookingWithLinesDto } from '../models/booking.model';
import { getCurrencySymbol } from '../models/preferences.model';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatExpansionModule,
    MatIconModule,
  ],
  template: `
    <div class="bookings-page">
      <mat-card class="main-card">
        <mat-card-header>
          <mat-card-title>Bookings</mat-card-title>
          <span class="header-actions">
            <button mat-icon-button (click)="load()" matTooltip="Refresh">
              <span class="material-symbols-outlined">refresh</span>
            </button>
          </span>
        </mat-card-header>
        <mat-card-content>
          @if (loading) {
            <p class="loading">Loading...</p>
          } @else if (bookings.length === 0) {
            <p class="empty">No bookings yet. Create bookings from transaction lines (e.g. via business rules).</p>
          } @else {
            <mat-accordion class="bookings-accordion" multi>
              @for (booking of bookings; track booking.id) {
                <mat-expansion-panel [class.out-of-balance]="isOutOfBalance(booking)">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <span class="panel-date">{{ formatDate(booking.date) }}</span>
                      <span class="panel-ref mono">{{ truncate(booking.reference, 40) }}</span>
                      @if (isOutOfBalance(booking)) {
                        <span class="out-of-balance-badge" matTooltip="Debits do not equal credits">
                          <span class="material-symbols-outlined">warning</span>
                          Out of balance
                        </span>
                      }
                    </mat-panel-title>
                    <mat-panel-description>
                      {{ booking.lines.length }} line{{ booking.lines.length === 1 ? '' : 's' }}
                    </mat-panel-description>
                  </mat-expansion-panel-header>
                  <div class="lines-section">
                    <h4 class="lines-heading">Line items</h4>
                    <div class="table-wrap">
                      <table mat-table [dataSource]="booking.lines" class="lines-table">
                        <ng-container matColumnDef="ledgerAccount">
                          <th mat-header-cell *matHeaderCellDef>Ledger account</th>
                          <td mat-cell *matCellDef="let line">
                            <span class="mono">{{ line.ledgerAccountCode ?? line.ledgerAccountId }}</span>
                            {{ line.ledgerAccountName ? ' ' + line.ledgerAccountName : '' }}
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="debit">
                          <th mat-header-cell *matHeaderCellDef>Debit</th>
                          <td mat-cell *matCellDef="let line">{{ formatAmount(line.debitAmount, line.currency) }}</td>
                        </ng-container>
                        <ng-container matColumnDef="credit">
                          <th mat-header-cell *matHeaderCellDef>Credit</th>
                          <td mat-cell *matCellDef="let line">{{ formatAmount(line.creditAmount, line.currency) }}</td>
                        </ng-container>
                        <ng-container matColumnDef="description">
                          <th mat-header-cell *matHeaderCellDef>Description</th>
                          <td mat-cell *matCellDef="let line">{{ line.description || '—' }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: lineColumns"></tr>
                        <tr class="mat-row" *matNoDataRow>
                          <td class="mat-cell" [attr.colspan]="lineColumns.length">No lines</td>
                        </tr>
                      </table>
                    </div>
                    @if (isOutOfBalance(booking)) {
                      <p class="balance-warning">
                        Total debits: {{ formatAmount(totalDebits(booking), booking.lines[0]?.currency ?? 'EUR') }}
                        ≠ Total credits: {{ formatAmount(totalCredits(booking), booking.lines[0]?.currency ?? 'EUR') }}
                      </p>
                    }
                  </div>
                </mat-expansion-panel>
              }
            </mat-accordion>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .bookings-page { min-height: 200px; }
    mat-card-header { display: flex; align-items: center; }
    .material-symbols-outlined { font-size: 24px; }
    .header-actions { margin-left: auto; }
    .loading, .empty { padding: 24px; color: #757575; }
    .bookings-accordion { margin: -16px 0; }
    .bookings-accordion .mat-mdc-expansion-panel { margin-bottom: 8px; }
    .bookings-accordion .mat-mdc-expansion-panel.out-of-balance .mat-mdc-expansion-panel-header {
      border-left: 4px solid #c62828;
    }
    html.theme-dark .bookings-accordion .mat-mdc-expansion-panel.out-of-balance .mat-mdc-expansion-panel-header {
      border-left-color: #ef5350;
    }
    .panel-date { margin-right: 12px; font-weight: 500; }
    .panel-ref { font-size: 0.9em; color: var(--mat-sys-on-surface-variant, #666); }
    html.theme-dark .panel-ref { color: rgba(255,255,255,0.7); }
    .out-of-balance-badge {
      display: inline-flex; align-items: center; gap: 4px;
      margin-left: 8px; padding: 2px 8px; border-radius: 4px;
      background: rgba(198, 40, 40, 0.12); color: #c62828;
      font-size: 0.8rem; font-weight: 500;
    }
    .out-of-balance-badge .material-symbols-outlined { font-size: 18px; }
    html.theme-dark .out-of-balance-badge { background: rgba(239, 83, 80, 0.2); color: #ef5350; }
    .lines-section { padding: 8px 0; }
    .lines-heading { margin: 0 0 8px; font-size: 0.95rem; font-weight: 500; }
    .table-wrap { overflow-x: auto; }
    .lines-table { width: 100%; min-width: 400px; }
    .lines-table th, .lines-table td { padding: 8px 12px; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85em; }
    .balance-warning { margin: 12px 0 0; padding: 8px 12px; background: rgba(198, 40, 40, 0.08); border-radius: 4px; font-size: 0.9rem; color: #c62828; }
    html.theme-dark .balance-warning { background: rgba(239, 83, 80, 0.15); color: #ef5350; }
  `],
})
export class BookingsComponent implements OnInit {
  private readonly service = inject(BookingsService);
  protected readonly getCurrencySymbol = getCurrencySymbol;

  bookings: BookingWithLinesDto[] = [];
  loading = false;
  readonly lineColumns: string[] = ['ledgerAccount', 'debit', 'credit', 'description'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.bookings = data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** True when sum of debits ≠ sum of credits (per booking). */
  isOutOfBalance(booking: BookingWithLinesDto): boolean {
    const debits = this.totalDebits(booking);
    const credits = this.totalCredits(booking);
    return Math.abs(Number(debits) - Number(credits)) > 0.005;
  }

  totalDebits(booking: BookingWithLinesDto): number {
    return booking.lines.reduce((s, l) => s + Number(l.debitAmount), 0);
  }

  totalCredits(booking: BookingWithLinesDto): number {
    return booking.lines.reduce((s, l) => s + Number(l.creditAmount), 0);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatAmount(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  truncate(s: string | null | undefined, max: number): string {
    if (s == null || s === '') return '';
    return s.length <= max ? s : s.slice(0, max) + '…';
  }
}
