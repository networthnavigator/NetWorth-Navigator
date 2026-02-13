import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UploadService } from '../services/upload.service';
import {
  Bank,
  UploadConfiguration,
} from '../models/upload-config.model';
import {
  UploadConfigDialogComponent,
  UploadConfigDialogData,
} from './upload-config-dialog.component';
import { AddBankDialogComponent, AddBankResult } from './add-bank-dialog.component';
import { DUTCH_BANKS } from '../models/banks.model';

function getDefaultBanks(): AddBankResult[] {
  const ing = DUTCH_BANKS.find(b => b.id === 'ing');
  if (!ing) return [];
  return [{
    bankId: ing.id,
    bankName: ing.name,
    country: 'NL',
    logoUrl: ing.logoUrl,
  }];
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <p class="instruction">
      Select a bank and then the file type you want to add.
      Or add the file directly and let the system determine which configuration matches.
    </p>

    <div class="top-blocks">
      <mat-card class="card-banks">
        <mat-card-header>
          <mat-card-title>Bank</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="bank-tiles">
            @for (bank of addedBanks(); track bank.bankId + bank.country) {
              <button
                class="bank-tile"
                [class.selected]="selectedBank()?.id === bank.bankId"
                (click)="selectAddedBank(bank)"
              >
                @if (bank.logoUrl) {
                  <img [src]="bank.logoUrl" [alt]="bank.bankName" class="bank-logo" [class.logo-transparent-bg]="isIngLogo(bank.logoUrl)" width="64" height="32">
                }
                <span class="bank-tile-name">{{ bank.bankName }} ({{ bank.country }})</span>
              </button>
            }
            <button type="button" class="add-bank-btn" (click)="openAddBankDialog()">
              <span class="material-symbols-outlined">add</span>
              Add bank
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="card-configs">
        <mat-card-header>
          <mat-card-title>File type</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (selectedBank()) {
            @if (configurations().length === 0 && !loadingConfigs()) {
              <p class="empty">No configurations known for {{ selectedBank()!.name }}.</p>
              <button type="button" class="add-config-btn" (click)="openNewConfigDialog()">
                <span class="material-symbols-outlined">add</span>
                New configuration
              </button>
            } @else if (loadingConfigs()) {
              <mat-spinner diameter="24"></mat-spinner>
          } @else {
            <div class="config-list">
              <button type="button" class="add-config-btn" (click)="openNewConfigDialog()">
                <span class="material-symbols-outlined">add</span>
                New configuration
              </button>
                @for (cfg of configurations(); track cfg.id) {
                  <button
                    class="config-tile"
                    [class.selected]="selectedConfig()?.id === cfg.id"
                    (click)="selectConfig(cfg)"
                  >
                    <span class="config-name">{{ cfg.name }}</span>
                    <span class="config-desc">{{ cfg.description }}</span>
                  </button>
                }
              </div>
            }
          } @else if (addedBanks().length === 0) {
            <p class="hint">Add a bank first.</p>
          } @else {
            <p class="hint">Select a bank.</p>
          }
        </mat-card-content>
      </mat-card>
    </div>

    <mat-card class="card-upload">
      <mat-card-header>
        <mat-card-title>Upload file</mat-card-title>
      </mat-card-header>
      <mat-card-content>
          <div class="drop-section">
            <div
              class="drop-zone"
              [class.drag-over]="isDragOver()"
              (click)="fileInput.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave()"
              (drop)="onDrop($event)"
            >
              <span class="material-symbols-outlined">upload_file</span>
              <span>Drag a CSV file here or click to choose</span>
              <input #fileInput type="file" accept=".csv,.txt" hidden (change)="onFileSelected($event)">
            </div>

            @if (selectedFile()) {
              <div class="selected-file">
                <span class="material-symbols-outlined">description</span>
                <span class="file-name">{{ selectedFile()!.name }}</span>
                @if (detectedConfig()) {
                  <span class="detected-badge">
                    <span class="material-symbols-outlined">check_circle</span>
                    Recognised: {{ detectedConfig()!.name }}
                  </span>
                }
                <button mat-icon-button type="button" (click)="clearFile(); $event.stopPropagation()" matTooltip="Remove file">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
            }

            @if (unknownFilePrompt()) {
              <div class="unknown-prompt">
                <span class="material-symbols-outlined">help</span>
                <span>This is an unknown file format. Would you like to create a configuration for this file type?</span>
                <div class="unknown-actions">
                  <button mat-stroked-button color="primary" (click)="openNewConfigForUnknownFile()">Create configuration</button>
                  <button mat-button (click)="clearFile()">Cancel</button>
                </div>
              </div>
            }
            @if (detectedConfig() && !confirmedForUpload()) {
              <div class="confirm-banner">
                <span class="material-symbols-outlined">info</span>
                <span>The system recognises this file as: <strong>{{ detectedConfig()!.name }}</strong>. Confirm to continue.</span>
                <button mat-stroked-button color="primary" (click)="confirmDetection()">Confirm</button>
                <button mat-button (click)="clearFile()">Cancel</button>
              </div>
            }

            @if (detecting()) {
              <p class="detecting"><mat-spinner diameter="20"></mat-spinner> Analysing file…</p>
            }
          </div>

          <div class="actions">
            <button mat-button type="button" (click)="onCancel()">Cancel</button>
            <button
              mat-raised-button
              color="primary"
              type="button"
              (click)="onUpload()"
              [disabled]="!canUpload() || uploading()"
            >
              @if (uploading()) {
                <mat-spinner diameter="20"></mat-spinner>
                Importing…
              } @else {
                Upload
              }
            </button>
          </div>
        </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .instruction {
      margin: 0 0 24px;
      color: #555;
      font-size: 1rem;
      line-height: 1.5;
    }
    html.theme-dark .instruction { color: rgba(255,255,255,0.8); }
    .top-blocks {
      display: grid;
      grid-template-columns: minmax(200px, 280px) 1fr;
      gap: 24px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    @media (max-width: 768px) {
      .top-blocks { grid-template-columns: 1fr; }
    }
    .card-banks, .card-configs { min-width: 0; }
    .hint { color: #666; font-size: 0.9em; margin: 0 0 16px; }
    html.theme-dark .hint { color: rgba(255,255,255,0.7); }
    .bank-tiles {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bank-tile {
      padding: 16px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 8px;
      background: #fafafa;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }
    html.theme-dark .bank-tile {
      border-color: rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
    }
    .bank-tile:hover { background: #f0f0f0; border-color: #999; }
    html.theme-dark .bank-tile:hover { background: rgba(255,255,255,0.08); }
    .bank-tile.selected {
      border-color: var(--mat-sys-primary, #1976d2);
      background: rgba(25, 118, 210, 0.08);
    }
    .bank-tile {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bank-tile-name { flex: 1; text-align: left; }
    .add-bank-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      border: 2px dashed rgba(0,0,0,0.2);
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      color: var(--mat-sys-primary, #1976d2);
      font: inherit;
      transition: border-color 0.2s, background 0.2s;
    }
    .add-bank-btn:hover {
      border-color: var(--mat-sys-primary, #1976d2);
      background: rgba(25, 118, 210, 0.05);
    }
    html.theme-dark .add-bank-btn { border-color: rgba(255,255,255,0.3); color: var(--mat-sys-primary); }
    html.theme-dark .add-bank-btn:hover { border-color: var(--mat-sys-primary); }
    .bank-logo {
      height: 32px;
      width: auto;
      min-width: 48px;
      object-fit: contain;
      background: #fff;
      padding: 4px;
      border-radius: 4px;
    }
    html.theme-dark .bank-logo {
      background: rgba(255,255,255,0.95);
    }
    .logo-transparent-bg { mix-blend-mode: lighten; }
    .configs-section { margin-bottom: 24px; }
    .configs-section h3 { margin: 0 0 12px; font-size: 0.95rem; }
    .config-list { display: flex; flex-direction: column; gap: 8px; }
    .config-tile {
      padding: 12px 16px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 8px;
      background: #fafafa;
      cursor: pointer;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.2s;
    }
    html.theme-dark .config-tile {
      border-color: rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
    }
    .config-tile:hover { background: #f0f0f0; }
    .config-tile.selected {
      border-color: var(--mat-sys-primary, #1976d2);
      background: rgba(25, 118, 210, 0.08);
    }
    .config-name { font-weight: 500; }
    .config-desc { font-size: 0.85em; color: #666; }
    html.theme-dark .config-desc { color: rgba(255,255,255,0.6); }
    .empty { color: #888; font-style: italic; }
    .add-config-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border: 2px dashed rgba(0,0,0,0.2);
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      color: var(--mat-sys-primary, #1976d2);
      font: inherit;
      transition: border-color 0.2s, background 0.2s;
    }
    .add-config-btn:hover {
      border-color: var(--mat-sys-primary, #1976d2);
      background: rgba(25, 118, 210, 0.05);
    }
    html.theme-dark .add-config-btn { border-color: rgba(255,255,255,0.3); color: var(--mat-sys-primary); }
    html.theme-dark .add-config-btn:hover { border-color: var(--mat-sys-primary); }
    .unknown-prompt {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      margin-top: 16px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.4);
      border-radius: 8px;
    }
    .unknown-prompt .material-symbols-outlined { color: #f57c00; }
    .unknown-actions { display: flex; gap: 8px; }
    .card-upload { min-width: 0; }
    .drop-section { margin: 16px 0; }
    .confirm-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      margin-top: 16px;
      background: rgba(25, 118, 210, 0.08);
      border: 1px solid rgba(25, 118, 210, 0.3);
      border-radius: 8px;
      flex-wrap: wrap;
    }
    html.theme-dark .confirm-banner {
      background: rgba(25, 118, 210, 0.15);
      border-color: rgba(25, 118, 210, 0.4);
    }
    .confirm-banner .material-symbols-outlined { color: #1976d2; flex-shrink: 0; }
    .confirm-banner span:not(.material-symbols-outlined) { flex: 1; min-width: 200px; }
    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: border-color 0.2s, background 0.2s;
    }
    html.theme-dark .drop-zone { border-color: rgba(255,255,255,0.3); }
    .drop-zone:hover { border-color: #999; background: #fafafa; }
    .drop-zone.drag-over { border-color: var(--mat-sys-primary, #1976d2); background: rgba(25, 118, 210, 0.06); }
    .drop-zone .material-symbols-outlined { font-size: 48px; color: #999; }
    .drop-zone.drag-over .material-symbols-outlined { color: var(--mat-sys-primary, #1976d2); }
    .selected-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    html.theme-dark .selected-file { background: rgba(255,255,255,0.08); }
    .selected-file .file-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .selected-file .material-symbols-outlined { font-size: 24px; flex-shrink: 0; }
    .detected-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85em;
      color: #2e7d32;
      margin-left: 8px;
    }
    html.theme-dark .detected-badge { color: #81c784; }
    .detected-badge .material-symbols-outlined { font-size: 18px; }
    .detecting { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .actions { display: flex; gap: 16px; justify-content: flex-end; margin-top: 16px; }
    .actions mat-spinner { display: inline-block; margin-right: 8px; }
  `],
})
export class UploadComponent implements OnInit {
  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  /** Seeded with ING NL by default. */
  readonly addedBanks = signal<AddBankResult[]>(getDefaultBanks());
  private readonly _selectedAddedBank = signal<AddBankResult | null>(null);

  /** Selected bank as Bank for config/upload logic. */
  isIngLogo(logoUrl: string | undefined): boolean {
    return !!logoUrl?.toLowerCase().includes('ing');
  }

  selectedBank(): Bank | null {
    const a = this._selectedAddedBank();
    if (!a) return null;
    return { id: a.bankId, name: a.bankName, logoUrl: a.logoUrl };
  }
  readonly configurations = signal<UploadConfiguration[]>([]);
  readonly selectedConfig = signal<UploadConfiguration | null>(null);
  readonly loadingConfigs = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly detectedConfig = signal<UploadConfiguration | null>(null);
  readonly detecting = signal(false);
  readonly uploading = signal(false);
  readonly isDragOver = signal(false);
  readonly confirmedForUpload = signal(false);
  readonly unknownFilePrompt = signal(false);

  ngOnInit() {
    /* Seed: select ING NL by default and load its configurations */
    const defaultBank = this.addedBanks()[0];
    if (defaultBank) {
      this._selectedAddedBank.set(defaultBank);
      this.loadConfigsForBank(defaultBank.bankId);
    }
  }

  /** Banks for config dialog (from catalog). */
  private banksForConfigDialog(): Bank[] {
    return DUTCH_BANKS.map(b => ({ id: b.id, name: b.name, logoUrl: b.logoUrl }));
  }

  private addBankFromCatalog(bankId: string, country: string = 'NL'): AddBankResult | undefined {
    const catalog = DUTCH_BANKS.find(b => b.id === bankId);
    if (!catalog) return undefined;
    const added: AddBankResult = {
      bankId: catalog.id,
      bankName: catalog.name,
      country: country as 'NL' | 'GB',
      logoUrl: catalog.logoUrl,
    };
    const exists = this.addedBanks().some(b => b.bankId === bankId && b.country === country);
    if (!exists) this.addedBanks.update(list => [...list, added]);
    return added;
  }

  openAddBankDialog() {
    const ref = this.dialog.open(AddBankDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((result?: AddBankResult) => {
      if (result) {
        const exists = this.addedBanks().some(
          b => b.bankId === result.bankId && b.country === result.country
        );
        if (!exists) this.addedBanks.update(list => [...list, result]);
        this._selectedAddedBank.set(result);
        this.loadConfigsForBank(result.bankId);
      }
    });
  }

  private loadConfigsForBank(bankId: string) {
    this.loadingConfigs.set(true);
    this.uploadService.getConfigurations(bankId).subscribe({
      next: (c) => {
        this.configurations.set(c);
        this.loadingConfigs.set(false);
        if (c.length === 1) this.selectedConfig.set(c[0]);
      },
      error: () => {
        this.loadingConfigs.set(false);
        this.snackBar.open('Could not load configurations', undefined, { duration: 3000 });
      },
    });
  }

  selectAddedBank(added: AddBankResult) {
    this._selectedAddedBank.set(added);
    this.selectedConfig.set(null);
    this.detectedConfig.set(null);
    this.loadConfigsForBank(added.bankId);
  }

  selectConfig(cfg: UploadConfiguration) {
    this.selectedConfig.set(cfg);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave() {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File) {
    this.selectedFile.set(file);
    this.detectedConfig.set(null);
    this.unknownFilePrompt.set(false);
    this.detecting.set(true);
    this.uploadService.detect(file).subscribe({
      next: (res) => {
        this.detecting.set(false);
        if (res.detected && res.configuration) {
          this.detectedConfig.set(res.configuration);
          const added = this.addedBanks().find(b => b.bankId === res.configuration!.bankId)
            ?? this.addBankFromCatalog(res.configuration!.bankId);
          if (added) {
            this._selectedAddedBank.set(added);
            this.loadingConfigs.set(true);
            this.uploadService.getConfigurations(added.bankId).subscribe({
              next: (configs) => {
                this.configurations.set(configs);
                this.loadingConfigs.set(false);
                this.selectedConfig.set(res.configuration!);
              },
            });
          }
        } else {
          this.unknownFilePrompt.set(true);
        }
      },
      error: () => {
        this.detecting.set(false);
        this.snackBar.open('Could not analyse file', undefined, { duration: 3000 });
      },
    });
  }

  openNewConfigDialog() {
    const bank = this.selectedBank();
    if (!bank) return;
    const data: UploadConfigDialogData = {
      bank,
      banks: this.banksForConfigDialog(),
    };
    const ref = this.dialog.open(UploadConfigDialogComponent, {
      data,
      width: '520px',
    });
    ref.afterClosed().subscribe((created?: UploadConfiguration) => {
      if (created) {
        this.configurations.update(c => [...c, created]);
        this.selectedConfig.set(created);
      }
    });
  }

  openNewConfigForUnknownFile() {
    const file = this.selectedFile();
    if (!file) return;
    this.uploadService.parseHeaders(file).subscribe({
      next: ({ headers }) => {
        const data: UploadConfigDialogData = {
          banks: this.banksForConfigDialog(),
          fileName: file.name,
          parsedHeaders: headers,
          isUnknownFile: true,
        };
        const ref = this.dialog.open(UploadConfigDialogComponent, {
          data,
          width: '520px',
        });
        ref.afterClosed().subscribe((created?: UploadConfiguration) => {
          if (created) {
            const added = this.addedBanks().find(b => b.bankId === created.bankId)
              ?? this.addBankFromCatalog(created.bankId);
            if (added) {
              this._selectedAddedBank.set(added);
              this.loadingConfigs.set(true);
              this.uploadService.getConfigurations(added.bankId).subscribe({
                next: (configs) => {
                  this.configurations.set(configs);
                  this.loadingConfigs.set(false);
                  this.selectedConfig.set(created);
                  this.detectedConfig.set(created);
                  this.confirmedForUpload.set(true);
                  this.unknownFilePrompt.set(false);
                },
              });
            }
          }
        });
      },
      error: () => this.snackBar.open('Could not read headers', undefined, { duration: 3000 }),
    });
  }

  clearFile() {
    this.selectedFile.set(null);
    this.detectedConfig.set(null);
    this.confirmedForUpload.set(false);
    this.unknownFilePrompt.set(false);
  }

  needsConfirmation(): boolean {
    return !!this.detectedConfig() && !this.confirmedForUpload();
  }

  confirmDetection() {
    this.confirmedForUpload.set(true);
  }

  onCancel() {
    this.clearFile();
  }

  canUpload(): boolean {
    const file = this.selectedFile();
    const config = this.selectedConfig();
    if (!file || !config) return false;
    if (this.detectedConfig() && !this.confirmedForUpload()) return false;
    return true;
  }

  onUpload() {
    const file = this.selectedFile();
    const config = this.selectedConfig();
    if (!file || !config) return;
    this.uploading.set(true);
    this.uploadService.import(file, config.id).subscribe({
      next: (r) => {
        this.uploading.set(false);
        this.clearFile();
        this.snackBar.open(
          `${r.imported} transactions imported${r.skipped > 0 ? `, ${r.skipped} skipped (duplicates)` : ''}`,
          undefined,
          { duration: 4000 }
        );
      },
      error: (err) => {
        this.uploading.set(false);
        this.snackBar.open(
          err?.error?.error ?? 'Import failed',
          undefined,
          { duration: 4000 }
        );
      },
    });
  }
}
