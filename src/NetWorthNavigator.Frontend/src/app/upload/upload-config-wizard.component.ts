import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  OnInit,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UploadService } from '../services/upload.service';
import { UploadConfiguration } from '../models/upload-config.model';

const FALLBACK_DB_SCHEMA: { id: string; label: string }[] = [
  { id: 'Date', label: 'Date' },
  { id: 'OwnAccount', label: 'Own account' },
  { id: 'ContraAccount', label: 'Counterparty account' },
  { id: 'ContraAccountName', label: 'Counterparty name' },
  { id: 'ExternalId', label: 'External ID (bank transaction ID, for deduplication)' },
  { id: 'Amount', label: 'Amount' },
  { id: '_AmountSign', label: 'Debit/Credit' },
  { id: 'Description', label: 'Description (e.g. Mededelingen)' },
  { id: 'BalanceAfter', label: 'Balance after' },
  { id: 'Currency', label: 'Currency' },
  { id: 'MovementType', label: 'Movement type (code)' },
  { id: 'MovementTypeLabel', label: 'Movement type (label)' },
  { id: 'Tag', label: 'Tag' },
];

const HASH_FIELDS = ['Date', 'OwnAccount', 'ContraAccount', 'Amount', 'BalanceAfter'];

export interface UploadConfigWizardInput {
  file: File;
  headers: string[];
  delimiter?: string;
  bankId?: string;
  banks: { id: string; name: string }[];
}

@Component({
  selector: 'app-upload-config-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="wizard">
      <header class="wizard-header">
        <h1>Create file type configuration</h1>
        <p class="step-indicator">Step {{ step() + 1 }} of 3</p>
        @if (step() === 0) {
          <p class="instruction">Enter the basic details for this file type.</p>
        } @else if (step() === 1) {
          <p class="instruction">Map the columns from your file to the database fields. Drag a file column to the right to link it.</p>
        } @else {
          <p class="instruction">Hash & validation. The configuration will be saved with the expected headers for future file detection.</p>
        }
      </header>

      @if (step() === 0) {
        <div class="wizard-content step-meta">
          <div class="meta-fields meta-fields-only">
            <mat-form-field appearance="outline">
              <mat-label>Bank</mat-label>
              <mat-select [(ngModel)]="form.bankId" name="bankId" required>
                @for (b of wizardInput().banks; track b.id) {
                  <mat-option [value]="b.id">{{ b.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="form.name" name="name" placeholder="e.g. Current account CSV" required>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <input matInput [(ngModel)]="form.description" name="description" placeholder="Optional">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Delimiter</mat-label>
              <mat-select [(ngModel)]="form.delimiter" name="delimiter">
                <mat-option value=";">Semicolon (;)</mat-option>
                <mat-option value=",">Comma (,)</mat-option>
                <mat-option value="\t">Tab</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Currency</mat-label>
              <input matInput [(ngModel)]="form.currency" name="currency" placeholder="e.g. EUR" maxlength="3">
              <mat-hint>ISO 4217 code (e.g. EUR, USD, GBP)</mat-hint>
            </mat-form-field>
          </div>
        </div>
      } @else if (step() === 1) {
        <div class="wizard-content step-mapping">
          <div class="columns three-cols">
            <div class="column file-fields-column">
              <h2>Columns in file</h2>
              <p class="column-hint">Drag to the right to link</p>
              <div class="field-list">
                @for (header of availableFileFields(); track header) {
                  <div
                    class="file-pill-wrap"
                    draggable="true"
                    (dragstart)="onDragStart($event, header)"
                  >
                    <div class="field-pill file-pill">
                      <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                      {{ header }}
                    </div>
                    @if (fileColumnSamples()[header]; as sample) {
                      <span class="file-column-sample">{{ sample }}</span>
                    }
                  </div>
                }
              </div>
            </div>
            <div class="column db-fields-column">
              <h2>Database fields</h2>
              <p class="column-hint">Drop a file column here (mapped fields appear in the list on the right)</p>
              @if (loadingDbFields()) {
                <mat-spinner diameter="24"></mat-spinner>
              } @else if (unmappedDbFields().length > 0) {
                <div class="mapping-card">
                  <div class="field-list">
                    @for (dbField of unmappedDbFields(); track dbField.id) {
                      <div
                        class="mapping-block"
                        [class.drag-over]="dragOverTarget() === dbField.id"
                        (dragover)="onDragOver($event, dbField.id)"
                        (dragleave)="onDragLeave()"
                        (drop)="onDrop($event, dbField.id)"
                      >
                        <div class="drop-zone-inner">
                          <span class="drop-placeholder">
                            <span class="material-symbols-outlined">add_circle_outline</span>
                            Drop here
                          </span>
                        </div>
                        <span class="db-field-label">{{ dbField.label }}</span>
                      </div>
                    }
                  </div>
                </div>
              } @else if (dbFields().length > 0) {
                <p class="db-fields-all-mapped">All database fields are mapped. Remove a mapping in the list on the right to map a different file column.</p>
              }
            </div>
            <div class="column mapped-fields-column">
              <h2>Mapped fields</h2>
              <p class="column-hint">All current mappings</p>
              <div class="mapped-list-card">
                @if (mappedEntries().length === 0) {
                  <p class="mapped-empty">No mappings yet. Drag file columns onto database fields.</p>
                } @else {
                  <ul class="mapped-list">
                    @for (entry of mappedEntries(); track entry.dbFieldId) {
                      <li class="mapped-list-item">
                        <span class="mapped-file-col">{{ entry.fileColumn }}</span>
                        <span class="mapped-arrow">→</span>
                        <span class="mapped-db-label">{{ entry.dbFieldLabel }}</span>
                        <button type="button" class="mapped-remove" (click)="clearMapping(entry.dbFieldId)" matTooltip="Remove mapping">
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="wizard-content step-hash">
          <div class="columns two-cols-hash">
            <div class="column file-fields-column">
              <h2>Columns in file</h2>
              <p class="column-hint">Drag to the right to build the deduplication key</p>
              <div class="field-list">
                @for (header of wizardInput().headers; track header) {
                  <div
                    class="file-pill-wrap"
                    draggable="true"
                    (dragstart)="onDragStartHash($event, header)"
                  >
                    <div class="field-pill file-pill">
                      <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                      {{ header }}
                    </div>
                    @if (fileColumnSamples()[header]; as sample) {
                      <span class="file-column-sample">{{ sample }}</span>
                    }
                  </div>
                }
              </div>
            </div>
            <div class="column hash-key-column">
              <mat-card class="hash-card">
                <h2>Deduplication key</h2>
                <p class="dedup-intro">To prevent the same transaction from being stored more than once (e.g. when you repeatedly upload the last 12 months), each record is identified by a unique key. During upload, records whose key is already in the database are skipped.</p>
                <p><strong>Drag file columns</strong> from the left into the area below. If you drag only one column (e.g. a bank transaction ID or GUID), that value is used as the key. If you drag several columns, the key is a hash of their values in order.</p>
                <div
                  class="hash-drop-zone"
                  [class.drag-over]="hashDragOver()"
                  (dragover)="onDragOverHash($event)"
                  (dragleave)="onDragLeaveHash()"
                  (drop)="onDropHash($event)"
                >
                  <span class="material-symbols-outlined">add_circle_outline</span>
                  <span>Drop file columns here</span>
                </div>
                @if (hashKeyColumns().length > 0) {
                  <div class="hash-key-list">
                    @for (col of hashKeyColumns(); track $index) {
                      <span class="hash-key-pill">
                        {{ col }}
                        <span class="material-symbols-outlined remove-btn" (click)="removeHashKeyColumn($index)" title="Remove">close</span>
                      </span>
                    }
                  </div>
                }
                <p class="dedup-note">If the same key appears multiple times in one file, all those records are still added (they are not skipped).</p>
              </mat-card>
              <mat-card class="headers-card">
                <h2>Expected headers (for validation)</h2>
                <p>These headers will be stored so future files of this type can be recognised:</p>
                <pre class="headers-preview">{{ wizardInput().headers.join('; ') }}</pre>
              </mat-card>
            </div>
          </div>
        </div>
      }

      <footer class="wizard-footer">
        @if (step() === 0) {
          <button mat-stroked-button type="button" (click)="onCancelClick()">Cancel</button>
          <button mat-raised-button color="primary" type="button" [disabled]="!canGoNext()" (click)="next()">
            Next
          </button>
        } @else if (step() === 1) {
          <button mat-stroked-button type="button" (click)="prev()">Back</button>
          <button mat-stroked-button type="button" (click)="onCancelClick()">Cancel</button>
          <button mat-raised-button color="primary" type="button" [disabled]="!canGoNext()" (click)="next()">
            Next
          </button>
        } @else {
          <button mat-stroked-button type="button" (click)="prev()">Back</button>
          <button mat-stroked-button type="button" (click)="onCancelClick()">Cancel</button>
          <button mat-raised-button color="primary" type="button" [disabled]="!canSave() || saving()" (click)="save()">
            @if (saving()) {
              <mat-spinner diameter="20"></mat-spinner>
              Saving…
            } @else {
              Save configuration
            }
          </button>
        }
      </footer>
    </div>
  `,
  styles: [`
    .wizard { display: flex; flex-direction: column; min-height: 320px; max-width: 1100px; margin: 0 auto; }
    .wizard-header { padding: 24px 0 16px; }
    .wizard-header h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 500; }
    .step-indicator { margin: 0 0 8px; font-size: 0.9rem; color: #666; }
    html.theme-dark .step-indicator { color: rgba(255,255,255,0.6); }
    .instruction { margin: 0; color: #666; font-size: 1rem; }
    html.theme-dark .instruction { color: rgba(255,255,255,0.7); }
    .wizard-content { flex: 1; padding: 16px 0; }
    .meta-fields { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .meta-fields mat-form-field { min-width: 200px; }
    .meta-fields-only { flex-direction: column; flex-wrap: nowrap; max-width: 400px; }
    .meta-fields-only mat-form-field { min-width: 0; width: 100%; }
    .columns { display: grid; grid-template-columns: max-content minmax(312px, 456px); gap: 16px; align-items: start; }
    .columns.three-cols { grid-template-columns: minmax(180px, 240px) minmax(280px, 360px) minmax(220px, 320px); }
    @media (max-width: 1100px) { .columns.three-cols { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 700px) { .columns.three-cols { grid-template-columns: 1fr; } }
    @media (max-width: 900px) { .columns { grid-template-columns: 1fr; } }
    .db-fields-column .mapping-card {
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 12px;
      padding: 20px;
      background: #fafafa;
      max-height: min(60vh, 480px);
      overflow-y: auto;
    }
    html.theme-dark .db-fields-column .mapping-card {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.03);
    }
    .mapping-block {
      min-height: 52px; padding: 8px; margin-bottom: 8px;
      display: flex; align-items: center; gap: 12px;
      border: 2px dashed rgba(0,0,0,0.15); border-radius: 8px;
      transition: border-color 0.2s, background 0.2s;
    }
    .mapping-block:last-child { margin-bottom: 0; }
    html.theme-dark .mapping-block { border-color: rgba(255,255,255,0.2); }
    .mapping-block.drag-over, .mapping-block.has-mapping {
      border-style: solid; border-color: rgba(25, 118, 210, 0.4);
      background: rgba(25, 118, 210, 0.06);
    }
    html.theme-dark .mapping-block.has-mapping {
      border-color: rgba(25, 118, 210, 0.5);
      background: rgba(25, 118, 210, 0.1);
    }
    .mapping-block .db-field-label { flex-shrink: 0; min-width: 120px; font-size: 0.9rem; font-weight: 500; color: #333; }
    html.theme-dark .mapping-block .db-field-label { color: rgba(255,255,255,0.9); }
    .mapping-block .db-field-sample { flex: 0 0 auto; font-size: 0.8rem; color: #666; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    html.theme-dark .mapping-block .db-field-sample { color: rgba(255,255,255,0.5); }
    .mapping-block .drop-zone-inner { flex: 1; min-width: 0; display: flex; align-items: center; min-height: 36px; }
    .column h2 { margin: 0 0 4px; font-size: 1rem; font-weight: 500; }
    .column-hint { margin: 0 0 12px; font-size: 0.85rem; color: #888; }
    html.theme-dark .column-hint { color: rgba(255,255,255,0.5); }
    .field-list { display: flex; flex-direction: column; gap: 8px; }
    .file-fields-column .field-list { gap: 8px; align-items: flex-start; }
    .file-fields-column .file-pill { width: fit-content; }
    .file-pill-wrap { display: flex; flex-direction: column; gap: 4px; cursor: grab; width: fit-content; }
    .file-pill-wrap:active { cursor: grabbing; }
    .file-column-sample { font-size: 0.8rem; color: #666; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-left: 2px; }
    html.theme-dark .file-column-sample { color: rgba(255,255,255,0.5); }
    .db-fields-column .field-list { gap: 0; }
    .field-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px; font-size: 0.9rem; font-weight: 500;
    }
    .file-pill { background: #f5f5f5; border: 1px solid #e0e0e0; color: #333; cursor: grab; }
    .file-pill:active { cursor: grabbing; }
    html.theme-dark .file-pill { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); }
    .mapped-pill { background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32; }
    html.theme-dark .mapped-pill { background: rgba(76, 175, 80, 0.2); border-color: rgba(76, 175, 80, 0.5); color: #81c784; }
    .mapped-pill .remove-btn { font-size: 16px; cursor: pointer; opacity: 0.7; margin-left: 4px; }
    .mapped-pill .remove-btn:hover { opacity: 1; }
    .drag-handle { font-size: 18px; opacity: 0.6; }
    .drop-placeholder { display: flex; align-items: center; gap: 8px; color: #999; font-size: 0.9rem; }
    html.theme-dark .drop-placeholder { color: rgba(255,255,255,0.4); }
    .drop-placeholder .material-symbols-outlined { font-size: 20px; }
    .mapped-fields-column .mapped-list-card {
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 12px;
      padding: 16px;
      background: #fafafa;
      max-height: min(60vh, 480px);
      overflow-y: auto;
    }
    html.theme-dark .mapped-fields-column .mapped-list-card {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.03);
    }
    .mapped-empty { margin: 0; font-size: 0.9rem; color: #888; font-style: italic; }
    html.theme-dark .mapped-empty { color: rgba(255,255,255,0.5); }
    .mapped-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .mapped-list-item {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 10px 12px; border-radius: 8px; background: rgba(25, 118, 210, 0.08);
      border: 1px solid rgba(25, 118, 210, 0.25);
    }
    html.theme-dark .mapped-list-item {
      background: rgba(25, 118, 210, 0.12);
      border-color: rgba(25, 118, 210, 0.35);
    }
    .mapped-file-col { font-weight: 500; font-size: 0.9rem; }
    .mapped-arrow { color: #1976d2; font-size: 0.9rem; flex-shrink: 0; }
    .mapped-db-label { font-size: 0.85rem; color: #555; }
    html.theme-dark .mapped-db-label { color: rgba(255,255,255,0.7); }
    .mapped-remove { flex-shrink: 0; margin-left: auto; padding: 4px; border: none; background: none; cursor: pointer; color: #666; border-radius: 4px; }
    .mapped-remove:hover { background: rgba(0,0,0,0.08); color: #333; }
    html.theme-dark .mapped-remove { color: rgba(255,255,255,0.6); }
    html.theme-dark .mapped-remove:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .mapped-remove .material-symbols-outlined { font-size: 18px; }
    .db-fields-all-mapped { margin: 0; padding: 16px; font-size: 0.9rem; color: #666; }
    html.theme-dark .db-fields-all-mapped { color: rgba(255,255,255,0.6); }
    .two-cols-hash { display: grid; grid-template-columns: minmax(180px, 260px) 1fr; gap: 24px; align-items: start; }
    @media (max-width: 768px) { .two-cols-hash { grid-template-columns: 1fr; } }
    .hash-key-column .hash-card { margin-bottom: 16px; }
    .step-hash .hash-card h2, .hash-key-column .headers-card h2 { margin: 0 0 8px; font-size: 1rem; font-weight: 500; }
    .step-hash p { margin: 0 0 12px; color: #666; font-size: 0.9rem; }
    .dedup-intro { margin-top: 0; }
    .dedup-note { margin-bottom: 0; font-size: 0.85rem; color: #888; }
    html.theme-dark .dedup-note { color: rgba(255,255,255,0.5); }
    html.theme-dark .step-hash p { color: rgba(255,255,255,0.7); }
    .hash-drop-zone {
      border: 2px dashed rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 20px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #666;
      transition: border-color 0.2s, background 0.2s;
    }
    .hash-drop-zone.drag-over { border-color: #1976d2; background: rgba(25, 118, 210, 0.08); color: #1976d2; }
    html.theme-dark .hash-drop-zone { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.6); }
    html.theme-dark .hash-drop-zone.drag-over { border-color: #42a5f5; background: rgba(25, 118, 210, 0.15); }
    .hash-drop-zone .material-symbols-outlined { font-size: 28px; }
    .hash-key-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .hash-key-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 12px; border-radius: 8px; font-size: 0.9rem;
      background: rgba(25, 118, 210, 0.12);
      border: 1px solid rgba(25, 118, 210, 0.35);
    }
    html.theme-dark .hash-key-pill { background: rgba(25, 118, 210, 0.2); border-color: rgba(25, 118, 210, 0.5); }
    .hash-key-pill .remove-btn { font-size: 16px; cursor: pointer; opacity: 0.7; }
    .hash-key-pill .remove-btn:hover { opacity: 1; }
    .headers-preview { background: #f5f5f5; padding: 12px; border-radius: 8px; font-size: 0.85rem; overflow-x: auto; margin: 0; }
    html.theme-dark .headers-preview { background: rgba(255,255,255,0.08); }
    .wizard-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 24px 0; border-top: 1px solid rgba(0,0,0,0.08); }
    html.theme-dark .wizard-footer { border-top-color: rgba(255,255,255,0.1); }
    .wizard-footer mat-spinner { display: inline-block; margin-right: 8px; vertical-align: middle; }
  `],
})
export class UploadConfigWizardComponent implements OnInit {
  readonly wizardInput = input.required<UploadConfigWizardInput>();
  @Output() saved = new EventEmitter<UploadConfiguration>();
  @Output() cancel = new EventEmitter<void>();

  readonly HASH_FIELDS = HASH_FIELDS;
  readonly step = signal(0);
  readonly dbFields = signal<{ id: string; label: string }[]>([]);
  readonly loadingDbFields = signal(true);
  readonly saving = signal(false);
  readonly mappings = signal<Record<string, string>>({});
  readonly dragOverTarget = signal<string | null>(null);
  readonly fileColumnSamples = signal<Record<string, string>>({});
  /** File column names (in order) that form the deduplication key (step 3). */
  readonly hashKeyColumns = signal<string[]>([]);
  readonly hashDragOver = signal(false);

  form = {
    bankId: '',
    name: '',
    description: '',
    delimiter: ';',
    currency: 'EUR',
  };

  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit() {
    const inp = this.wizardInput();
    if (inp.delimiter) this.form.delimiter = inp.delimiter;
    this.loadFileSamples();
    this.uploadService.getColumnSchema().subscribe({
      next: (schema) => {
        const list = schema?.length ? schema : [];
        const byId = new Map(list.map((f) => [f.id, f]));
        FALLBACK_DB_SCHEMA.forEach((f) => {
          if (!byId.has(f.id)) {
            list.push(f);
            byId.set(f.id, f);
          }
        });
        this.dbFields.set(list.length ? list : FALLBACK_DB_SCHEMA);
        this.loadingDbFields.set(false);
      },
      error: () => {
        this.dbFields.set(FALLBACK_DB_SCHEMA);
        this.loadingDbFields.set(false);
      },
    });
  }

  readonly fileHeaders = computed(() => this.wizardInput()?.headers ?? []);

  readonly mappedEntries = computed(() => {
    const m = this.mappings();
    return this.dbFields().filter((f) => m[f.id]).map((f) => ({
      fileColumn: m[f.id],
      dbFieldId: f.id,
      dbFieldLabel: this.getDbFieldLabel(f.id),
    }));
  });

  /** Database fields that have no mapping yet; only these appear in the middle column. */
  readonly unmappedDbFields = computed(() =>
    this.dbFields().filter((f) => !this.mappings()[f.id])
  );

  readonly availableFileFields = computed(() => {
    const mapped = new Set(Object.values(this.mappings()));
    return (this.wizardInput()?.headers ?? []).filter((h: string) => !mapped.has(h));
  });

  getMapping(dbFieldId: string) {
    return () => this.mappings()[dbFieldId] ?? null;
  }

  getDbFieldLabel(dbFieldId: string): string {
    return this.dbFields().find((f) => f.id === dbFieldId)?.label ?? dbFieldId;
  }

  onDragStart(event: DragEvent, fileField: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({ fileField }));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent, dbFieldId: string) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragOverTarget.set(dbFieldId);
  }

  onDragLeave() {
    this.dragOverTarget.set(null);
  }

  onDrop(event: DragEvent, dbFieldId: string) {
    event.preventDefault();
    this.dragOverTarget.set(null);
    const json = event.dataTransfer?.getData('application/json');
    if (!json) return;
    try {
      const { fileField } = JSON.parse(json);
      if (fileField) this.mappings.update((m) => ({ ...m, [dbFieldId]: fileField }));
    } catch { /* ignore */ }
  }

  clearMapping(dbFieldId: string) {
    this.mappings.update((m) => {
      const next = { ...m };
      delete next[dbFieldId];
      return next;
    });
  }

  onDragStartHash(event: DragEvent, fileField: string): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({ fileField, forHash: true }));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOverHash(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.hashDragOver.set(true);
  }

  onDragLeaveHash(): void {
    this.hashDragOver.set(false);
  }

  onDropHash(event: DragEvent): void {
    event.preventDefault();
    this.hashDragOver.set(false);
    const json = event.dataTransfer?.getData('application/json');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      const fileField = data?.fileField;
      if (!fileField || typeof fileField !== 'string') return;
      const current = this.hashKeyColumns();
      if (current.includes(fileField)) return;
      this.hashKeyColumns.set([...current, fileField]);
    } catch { /* ignore */ }
  }

  removeHashKeyColumn(index: number): void {
    this.hashKeyColumns.update((cols) => cols.filter((_, i) => i !== index));
  }

  private loadFileSamples(): void {
    const inp = this.wizardInput();
    if (!inp.file || !inp.headers?.length) return;
    inp.file.text().then((text) => {
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      if (lines.length < 2) return;
      const delim = this.form.delimiter === '\\t' ? '\t' : (this.form.delimiter || ';');
      const parse = (line: string) => line.split(delim).map((s) => s.trim().replace(/^"|"$/g, ''));
      const headerParts = parse(lines[0]);
      const valueParts = parse(lines[1]);
      const samples: Record<string, string> = {};
      headerParts.forEach((h, i) => {
        samples[h] = valueParts[i] ?? '';
      });
      this.fileColumnSamples.set(samples);
    }).catch(() => {});
  }

  canGoNext(): boolean {
    if (this.step() === 0) {
      return !!this.form.bankId && !!this.form.name?.trim();
    }
    const m = this.mappings();
    return !!m['Date'] && !!m['Amount'];
  }

  canSave(): boolean {
    if (this.step() < 2) return false;
    return this.canGoNext() && this.hashKeyColumns().length >= 1;
  }

  next() {
    if (this.canGoNext()) this.step.update((s) => s + 1);
  }

  prev() {
    this.step.update((s) => Math.max(0, s - 1));
  }

  onCancelClick() {
    this.cancel.emit();
  }

  save() {
    if (!this.canSave() || this.saving()) return;
    const m = this.mappings();
    const columnMapping = Object.entries(m)
      .filter(([, fileCol]) => !!fileCol)
      .map(([dbField, fileColumn]) => ({ fileColumn, dbField }));
    const config = {
      bankId: this.form.bankId,
      name: this.form.name.trim(),
      description: (this.form.description ?? '').trim(),
      delimiter: this.form.delimiter || ';',
      currency: (this.form.currency ?? 'EUR').trim().toUpperCase() || 'EUR',
      expectedHeaders: this.wizardInput().headers,
      columnMapping,
      hashFileColumns: this.hashKeyColumns(),
    };
    this.saving.set(true);
    this.uploadService.createConfiguration(config).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.snackBar.open(`Configuration "${created.name}" saved`, undefined, { duration: 3000 });
        this.saved.emit(created);
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err?.error?.error ?? 'Save failed', undefined, { duration: 4000 });
      },
    });
  }
}
