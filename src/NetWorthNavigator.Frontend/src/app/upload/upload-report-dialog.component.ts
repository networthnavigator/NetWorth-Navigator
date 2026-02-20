import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadService } from '../services/upload.service';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { PreviewResult } from '../models/upload-config.model';
import { getCurrencySymbol } from '../models/preferences.model';
import { AddUnknownAccountsWizardComponent } from './add-unknown-accounts-wizard.component';

export interface UploadReportDialogData {
  file: File;
  configurationId: string;
  configName: string;
  preview: PreviewResult;
}

@Component({
  selector: 'app-upload-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Check imported bookings</h2>
    <mat-dialog-content>
      <p class="intro">Review the preview below. Documents marked as "import" will be saved when you click <strong>Import bookings</strong>.</p>

      @if (missingAccounts().length > 0 || unlinkedAccounts().length > 0) {
        <div class="accounts-required">
          <p class="required-intro">Every own account in the file must exist in <strong>My accounts</strong> and be linked to a ledger before you can import.</p>
          @if (missingAccounts().length > 0) {
            <p class="required-list"><strong>Add these accounts:</strong></p>
            <ul class="account-list">
              @for (acc of missingAccounts(); track acc) {
                <li><span class="mono">{{ acc }}</span></li>
              }
            </ul>
            <button mat-stroked-button (click)="openAddAccountsWizard()">Add accounts</button>
          }
          @if (unlinkedAccounts().length > 0) {
            <p class="required-list"><strong>Link these in Assets &amp; Liabilities:</strong></p>
            <ul class="account-list">
              @for (acc of unlinkedAccounts(); track acc) {
                <li><span class="mono">{{ acc }}</span></li>
              }
            </ul>
          }
        </div>
      }

      <div class="summary-cards">
        <div class="summary-card ready">
          <span class="summary-value">{{ data.preview.readyForImport }}</span>
          <span class="summary-label">Documents ready for import</span>
        </div>
        <div class="summary-card skip">
          <span class="summary-value">{{ data.preview.toSkip }}</span>
          <span class="summary-label">Documents to skip</span>
        </div>
      </div>

      <div class="table-wrap">
        <table mat-table [dataSource]="data.preview.lines" class="report-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let row">{{ row.date ?? '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let row">{{ row.name || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>Amount</th>
            <td mat-cell *matCellDef="let row">{{ formatAmount(row.amount, row.currency) }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>Action</th>
            <td mat-cell *matCellDef="let row">
              <span class="action-badge" [class.import]="row.action === 'import'" [class.skip]="row.action === 'skip'">
                {{ row.action === 'import' ? 'Import' : 'Skip' }}{{ row.action === 'skip' && row.actionReason ? ' — ' + row.actionReason : '' }}
              </span>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="4">No lines</td>
          </tr>
        </table>
      </div>

      @if (importing()) {
        <p class="importing"><mat-spinner diameter="24"></mat-spinner> Importing…</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
      <button
        mat-raised-button
        color="primary"
        (click)="importBookings()"
        [disabled]="importing() || !canImport()"
      >
        Import bookings
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .intro { margin: 0 0 16px; color: rgba(0,0,0,0.7); font-size: 0.95rem; }
    html.theme-dark .intro { color: rgba(255,255,255,0.8); }
    .summary-cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .summary-card {
      padding: 16px 20px; border-radius: 8px; min-width: 160px;
      background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08);
    }
    html.theme-dark .summary-card { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
    .summary-card.ready { border-left: 4px solid #2e7d32; }
    .summary-card.skip { border-left: 4px solid #ed6c02; }
    .summary-value { display: block; font-size: 1.75rem; font-weight: 600; }
    .summary-label { font-size: 0.85rem; color: rgba(0,0,0,0.6); }
    html.theme-dark .summary-label { color: rgba(255,255,255,0.7); }
    .table-wrap { overflow-x: auto; max-height: 360px; overflow-y: auto; margin-bottom: 16px; }
    .report-table { width: 100%; min-width: 400px; }
    .report-table th, .report-table td { padding: 8px 12px; }
    .action-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 500;
    }
    .action-badge.import { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
    .action-badge.skip { background: rgba(237, 108, 2, 0.12); color: #ed6c02; }
    .importing { display: flex; align-items: center; gap: 8px; margin: 16px 0 0; }
    .accounts-required {
      margin-bottom: 20px; padding: 16px; background: rgba(237, 108, 2, 0.08); border: 1px solid rgba(237, 108, 2, 0.3); border-radius: 8px;
    }
    .required-intro { margin: 0 0 12px; font-size: 0.95rem; }
    .required-list { margin: 8px 0 4px; font-size: 0.9rem; }
    .account-list { margin: 4px 0 12px; padding-left: 24px; }
    .account-list .mono { font-family: ui-monospace, monospace; }
  `],
})
export class UploadReportDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<UploadReportDialogComponent>);
  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly assetsService = inject(AssetsLiabilitiesService);
  private readonly matDialog = inject(MatDialog);
  readonly data = inject<UploadReportDialogData>(MAT_DIALOG_DATA);

  readonly importing = signal(false);
  readonly missingAccounts = signal<string[]>([]);
  readonly unlinkedAccounts = signal<string[]>([]);

  displayedColumns = ['date', 'name', 'amount', 'action'];

  canImport(): boolean {
    return this.data.preview.readyForImport > 0 &&
      this.missingAccounts().length === 0 &&
      this.unlinkedAccounts().length === 0;
  }

  ngOnInit(): void {
    this.refreshAccountCheck();
  }

  refreshAccountCheck(): void {
    const inFile = this.data.preview.ownAccountsInFile ?? [];
    if (inFile.length === 0) {
      this.missingAccounts.set([]);
      this.unlinkedAccounts.set([]);
      return;
    }
    this.assetsService.getAccounts().subscribe({
      next: (accounts) => {
        // Match file "own account" by account name or accountNumber (e.g. IBAN)
        const linkedSet = new Set<string>();
        const presentSet = new Set<string>();
        accounts.forEach(a => {
          const keyName = (a.name ?? '').trim().toLowerCase();
          const keyNum = (a.accountNumber ?? '').trim().toLowerCase();
          if (keyName) {
            presentSet.add(keyName);
            if (a.ledgerAccountId != null) linkedSet.add(keyName);
          }
          if (keyNum) {
            presentSet.add(keyNum);
            if (a.ledgerAccountId != null) linkedSet.add(keyNum);
          }
        });
        const missing: string[] = [];
        const unlinked: string[] = [];
        inFile.forEach(oa => {
          const s = (oa ?? '').trim();
          if (!s) return;
          const key = s.toLowerCase();
          if (linkedSet.has(key)) return; // OK: exists and linked
          if (presentSet.has(key)) unlinked.push(s);
          else missing.push(s);
        });
        this.missingAccounts.set(missing);
        this.unlinkedAccounts.set(unlinked);
      },
      error: () => {
        this.missingAccounts.set(this.data.preview.ownAccountsInFile ?? []);
        this.unlinkedAccounts.set([]);
      },
    });
  }

  openAddAccountsWizard(): void {
    const unknown = this.missingAccounts();
    if (unknown.length === 0) return;
    this.matDialog.open(AddUnknownAccountsWizardComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { unknownAccounts: unknown },
    }).afterClosed().subscribe((added) => {
      if (added) this.refreshAccountCheck();
    });
  }

  formatAmount(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  importBookings(): void {
    if (!this.canImport()) return;
    this.importing.set(true);
    this.uploadService.import(this.data.file, this.data.configurationId).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.snackBar.open(
          `${result.imported} transaction(s) imported${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`,
          undefined,
          { duration: 4000 }
        );
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.importing.set(false);
        this.snackBar.open(err?.error?.error ?? 'Import failed', undefined, { duration: 4000 });
      },
    });
  }
}
