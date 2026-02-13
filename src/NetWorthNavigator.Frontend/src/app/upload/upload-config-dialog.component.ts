import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Bank, UploadConfiguration } from '../models/upload-config.model';
import { UploadService } from '../services/upload.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export const DB_FIELDS = [
  { value: 'Date', label: 'Date' },
  { value: 'OwnAccount', label: 'Account number' },
  { value: 'ContraAccount', label: 'Counterparty' },
  { value: 'Amount', label: 'Amount' },
  { value: '_AmountSign', label: 'Debit/Credit' },
  { value: 'Description', label: 'Description' },
  { value: 'BalanceAfter', label: 'Balance after' },
  { value: 'Tag', label: 'Tag' },
];

export interface UploadConfigDialogData {
  bank?: Bank;
  banks: Bank[];
  fileName?: string;
  parsedHeaders?: string[];
  isUnknownFile?: boolean;
}

@Component({
  selector: 'app-upload-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>New file configuration</h2>
    <mat-dialog-content>
      @if (data.isUnknownFile) {
        <div class="unknown-banner">
          <span class="material-symbols-outlined">info</span>
          <p>This is an unknown file format. Would you like to create a configuration for this file type?</p>
          @if (data.fileName) {
            <p class="file-name">File: {{ data.fileName }}</p>
          }
        </div>
      }
      <form class="form">
        @if (!data.bank) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Bank</mat-label>
            <mat-select [(ngModel)]="form.bankId" name="bankId" required>
              @for (b of data.banks; track b.id) {
                <mat-option [value]="b.id">{{ b.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name" name="name" placeholder="e.g. Current account – CSV" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <input matInput [(ngModel)]="form.description" name="description" placeholder="Optional">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Delimiter</mat-label>
          <mat-select [(ngModel)]="form.delimiter" name="delimiter">
            <mat-option value=";">Semicolon (;)</mat-option>
            <mat-option value=",">Comma (,)</mat-option>
            <mat-option value="\t">Tab</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Headers (one per line)</mat-label>
          <textarea matInput [(ngModel)]="headersText" name="headers" rows="4"
                    placeholder="Date&#10;Name / Description&#10;Amount (EUR)"></textarea>
        </mat-form-field>
        <div class="mapping-section">
          <h3>Column mapping</h3>
          <p class="mapping-hint">Select the corresponding column from the file for each field.</p>
          @for (f of DB_FIELDS; track f.value) {
            <mat-form-field appearance="outline" class="mapping-field">
              <mat-label>{{ f.label }}</mat-label>
              <mat-select [(ngModel)]="form.mappings[f.value]" name="map-{{ f.value }}">
                <mat-option value="">— not mapped —</mat-option>
                @for (h of headersList(); track h) {
                  <mat-option [value]="h">{{ h }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 8px; min-width: 400px; max-width: 500px; }
    .full-width { width: 100%; }
    .unknown-banner {
      background: rgba(25, 118, 210, 0.1);
      border: 1px solid rgba(25, 118, 210, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .unknown-banner .material-symbols-outlined { color: #1976d2; }
    .unknown-banner .file-name { font-size: 0.9em; color: #666; }
    html.theme-dark .unknown-banner .file-name { color: rgba(255,255,255,0.7); }
    .mapping-section { margin-top: 16px; }
    .mapping-section h3 { margin: 0 0 8px; font-size: 0.95rem; }
    .mapping-hint { margin: 0 0 12px; font-size: 0.85em; color: #666; }
    html.theme-dark .mapping-hint { color: rgba(255,255,255,0.6); }
    .mapping-field { width: 100%; }
  `],
})
export class UploadConfigDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UploadConfigDialogComponent>);
  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<UploadConfigDialogData>(MAT_DIALOG_DATA);

  readonly DB_FIELDS = DB_FIELDS;

  headersText = this.data.parsedHeaders?.join('\n') ?? '';

  form = {
    bankId: this.data.bank?.id ?? '',
    name: '',
    description: '',
    delimiter: ';',
    mappings: Object.fromEntries(DB_FIELDS.map(f => [f.value, ''])) as Record<string, string>,
  };

  headersList = (): string[] => {
    const t = this.headersText.trim();
    if (!t) return [];
    return t.split(/[\n,;]+/).map(h => h.trim()).filter(Boolean);
  };

  canSave(): boolean {
    if (!this.form.name?.trim()) return false;
    if (!this.data.bank && !this.form.bankId) return false;
    const headers = this.headersList();
    if (headers.length === 0) return false;
    const dateCol = this.form.mappings['Date'];
    const amountCol = this.form.mappings['Amount'];
    return !!(dateCol && amountCol);
  }

  save() {
    const bankId = this.data.bank?.id ?? this.form.bankId;
    if (!bankId) return;
    const headers = this.headersList();
    const columnMapping = DB_FIELDS
      .filter(f => this.form.mappings[f.value])
      .map(f => ({ fileColumn: this.form.mappings[f.value], dbField: f.value }));
    const config: Partial<UploadConfiguration> = {
      bankId,
      name: this.form.name.trim(),
      description: this.form.description?.trim() ?? '',
      delimiter: this.form.delimiter || ';',
      expectedHeaders: headers,
      columnMapping,
    };
    this.uploadService.createConfiguration(config).subscribe({
      next: (created) => {
        this.snackBar.open(`Configuration "${created.name}" added`, undefined, { duration: 3000 });
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.snackBar.open(err?.error?.error ?? 'Save failed', undefined, { duration: 4000 });
      },
    });
  }
}
