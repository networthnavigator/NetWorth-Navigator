import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { BankTransactionsHeaderService } from '../services/bank-transactions-header.service';
import { BankTransactionsHeader } from '../models/bank-transactions-header.model';
import { getCurrencySymbol } from '../models/preferences.model';

@Component({
  selector: 'app-transacties',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Transactions</mat-card-title>
        <span class="header-actions">
          <button mat-icon-button (click)="load()" matTooltip="Refresh">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </span>
      </mat-card-header>
      <mat-card-content>
        @if (loading) {
          <p class="loading">Loading...</p>
        } @else if (transactions.length === 0) {
          <p class="empty">No transactions yet.</p>
        } @else {
          <mat-list>
            @for (t of transactions; track t.id) {
              <mat-list-item>
                <span matListItemTitle>
                  {{ formatDate(t.date) }} — {{ getCurrencySymbol(t.currency) }} {{ t.amount | number:'1.2-2' }}
                  @if (t.contraAccount) {
                    — {{ t.contraAccount }}
                  }
                </span>
                @if (t.description) {
                  <span matListItemLine>{{ t.description }}</span>
                }
              </mat-list-item>
              <mat-divider></mat-divider>
            }
          </mat-list>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header { display: flex; align-items: center; }
    .material-symbols-outlined { font-size: 24px; }
    .header-actions { margin-left: auto; }
    .loading, .empty { padding: 24px; color: #757575; }
    mat-list { padding: 0; }
  `],
})
export class TransactiesComponent implements OnInit {
  private readonly service = inject(BankTransactionsHeaderService);
  protected readonly getCurrencySymbol = getCurrencySymbol;

  transactions: BankTransactionsHeader[] = [];
  loading = false;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.transactions = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
