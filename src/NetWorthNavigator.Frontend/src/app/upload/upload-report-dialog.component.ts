import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadService } from '../services/upload.service';
import { PreviewResult } from '../models/upload-config.model';
import { getCurrencySymbol } from '../models/preferences.model';

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
                {{ row.action === 'import' ? 'Import' : 'Skip' }}
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
        [disabled]="importing() || data.preview.readyForImport === 0"
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
  `],
})
export class UploadReportDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UploadReportDialogComponent>);
  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<UploadReportDialogData>(MAT_DIALOG_DATA);

  readonly importing = signal(false);

  displayedColumns = ['date', 'name', 'amount', 'action'];

  formatAmount(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  importBookings(): void {
    if (this.data.preview.readyForImport === 0) return;
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
