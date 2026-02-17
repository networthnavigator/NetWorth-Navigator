import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccountStructureService } from '../services/account-structure.service';
import { LedgerService } from '../services/ledger.service';
import { ChartOfAccountsSeedService } from '../services/ledger.service';
import { AccountStructure } from '../models/account-structure.model';
import { LedgerAccount } from '../models/ledger-account.model';
import { AccountStructureTreeComponent } from './account-structure-tree.component';

@Component({
  selector: 'app-rekening-schema',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    AccountStructureTreeComponent,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Chart of accounts</mat-card-title>
        <span class="header-actions">
          <button mat-stroked-button (click)="updateSeedFile()" matTooltip="Update seed file with current data">
            <span class="material-symbols-outlined">save</span>
            Update seed file
          </button>
          <button mat-stroked-button (click)="seedData()" matTooltip="Seed data from repository file">
            <span class="material-symbols-outlined">upload</span>
            Seed data
          </button>
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
            <div class="section-header">
              <h3>Structure &amp; ledger accounts</h3>
              <label class="toggle-label">
                <mat-slide-toggle [(ngModel)]="showStructureWithoutLedgers" (ngModelChange)="onToggleStructureWithoutLedgers()">
                  Show structure without ledgers
                </mat-slide-toggle>
              </label>
            </div>
            <p class="section-desc">Structure with ledger accounts per account class. Expand an account class to see or add ledgers. The range (e.g. 12300–12399) is indicative: you can use more digits (12301, 12302, …) for more than 10 accounts in the same class.</p>
            @if (structure().length === 0) {
              <p class="empty">Add ledger accounts in the structure below to see them here.</p>
            } @else {
              <app-account-structure-tree
                [tree]="structure()"
                [ledgerAccounts]="ledgerAccounts()"
                (saved)="load()"
                (deleted)="load()"
              />
            }
          </section>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header { display: flex; align-items: center; }
    .header-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .header-actions button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .loading, .empty, .error { padding: 24px; color: #757575; }
    .error { color: #c62828; }
    .loading { display: flex; align-items: center; gap: 8px; }
    .structure-section { margin-top: 24px; }
    .structure-section h3 { margin: 0 0 8px 0; font-size: 1.1em; }
    .section-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .section-header h3 { margin: 0; }
    .toggle-label { display: flex; align-items: center; font-size: 14px; }
    .section-desc { margin: 8px 0 12px 0; color: #757575; font-size: 0.9em; }
    .structure-section .empty { padding: 16px 0; }
  `],
})
export class RekeningSchemaComponent implements OnInit {
  private readonly structureService = inject(AccountStructureService);
  private readonly ledgerService = inject(LedgerService);
  private readonly seedService = inject(ChartOfAccountsSeedService);
  private readonly snackBar = inject(MatSnackBar);

  readonly structure = signal<AccountStructure[]>([]);
  readonly ledgerAccounts = signal<LedgerAccount[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  /** When true, show full structure (including nodes with no ledgers). */
  showStructureWithoutLedgers = false;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loadError.set(null);
    this.loading.set(true);
    const structure$ = this.showStructureWithoutLedgers
      ? this.structureService.getFullStructure()
      : this.structureService.getUsedStructure();
    forkJoin({
      structure: structure$,
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

  onToggleStructureWithoutLedgers(): void {
    this.loadError.set(null);
    this.loading.set(true);
    const structure$ = this.showStructureWithoutLedgers
      ? this.structureService.getFullStructure()
      : this.structureService.getUsedStructure();
    structure$.subscribe({
      next: (structure) => {
        this.structure.set(structure ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.error ?? err?.message ?? 'Error loading structure.');
        this.loading.set(false);
      },
    });
  }

  updateSeedFile(): void {
    if (!confirm('This will update the seed file with your current ledger accounts. Continue?')) return;
    this.seedService.updateSeedFile().subscribe({
      next: (result) => {
        this.snackBar.open('Seed file updated: ' + result.path, undefined, { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open('Error updating seed file: ' + (err?.error?.error || err?.message || 'Unknown error'), undefined, { duration: 5000 });
      },
    });
  }

  seedData(): void {
    if (!confirm('This will add ledger accounts from the repository seed file to your existing data. Continue?')) return;
    this.seedService.seed().subscribe({
      next: (result) => {
        this.snackBar.open('Seeded: ' + result.ledgerAccountsAdded + ' ledger account(s) added.', undefined, { duration: 4000 });
        this.load();
      },
      error: (err) => {
        this.snackBar.open('Error seeding data: ' + (err?.error?.error || err?.message || 'Unknown error'), undefined, { duration: 5000 });
      },
    });
  }
}
