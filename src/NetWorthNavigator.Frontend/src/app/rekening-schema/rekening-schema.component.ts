import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccountStructureService } from '../services/account-structure.service';
import { LedgerService } from '../services/ledger.service';
import { AccountStructure } from '../models/account-structure.model';
import { LedgerAccount } from '../models/ledger-account.model';
import { AccountStructureTreeComponent } from './account-structure-tree.component';
import { LedgerTableComponent } from './ledger-table.component';

@Component({
  selector: 'app-rekening-schema',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    AccountStructureTreeComponent,
    LedgerTableComponent,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Chart of accounts</mat-card-title>
        <span class="header-actions">
          <button mat-icon-button (click)="load()" matTooltip="Refresh">
            <span class="material-symbols-outlined">refresh</span>
          </button>
        </span>
      </mat-card-header>
      <mat-card-content>
        @if (loadError()) {
          <p class="error">{{ loadError() }} <button mat-button (click)="load()">Retry</button></p>
        } @else if (loading()) {
          <p class="loading"><mat-spinner diameter="24"></mat-spinner> Loading...</p>
        } @else {
          <section class="structure-section">
            <h3>Structure (in use)</h3>
            <p class="section-desc">Fixed chart of accounts structure. Only categories with ledger accounts are shown.</p>
            @if (structure().length === 0) {
              <p class="empty">Add ledger accounts below to see the structure here.</p>
            } @else {
              <app-account-structure-tree [tree]="structure()" />
            }
          </section>

          <section class="ledger-section">
            <h3>Ledger accounts</h3>
            <p class="section-desc">Your accounts. Add, edit, or delete as needed.</p>
            <app-ledger-table
              [accounts]="ledgerAccounts()"
              (saved)="load()"
              (deleted)="load()"
            />
          </section>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header { display: flex; align-items: center; }
    .header-actions { margin-left: auto; }
    .loading, .empty, .error { padding: 24px; color: #757575; }
    .error { color: #c62828; }
    .loading { display: flex; align-items: center; gap: 8px; }
    .structure-section, .ledger-section { margin-top: 24px; }
    .structure-section h3, .ledger-section h3 { margin: 0 0 8px 0; font-size: 1.1em; }
    .section-desc { margin: 0 0 12px 0; color: #757575; font-size: 0.9em; }
    .structure-section .empty { padding: 16px 0; }
  `],
})
export class RekeningSchemaComponent implements OnInit {
  private readonly structureService = inject(AccountStructureService);
  private readonly ledgerService = inject(LedgerService);

  readonly structure = signal<AccountStructure[]>([]);
  readonly ledgerAccounts = signal<LedgerAccount[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loadError.set(null);
    this.loading.set(true);
    forkJoin({
      structure: this.structureService.getUsedStructure(),
      ledger: this.ledgerService.getAll(),
    }).subscribe({
      next: ({ structure, ledger }) => {
        this.structure.set(structure ?? []);
        this.ledgerAccounts.set(ledger ?? []);
        this.loadError.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.error ?? err?.message ?? 'Error loading. Ensure the backend is running.');
        this.loading.set(false);
      },
    });
  }
}
