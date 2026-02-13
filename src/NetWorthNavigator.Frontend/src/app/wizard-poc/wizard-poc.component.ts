import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UploadService } from '../services/upload.service';

const FILE_HEADERS = [
  'Datum',
  'Naam / Omschrijving',
  'Rekening',
  'Tegenrekening',
  'Code',
  'Af Bij',
  'Bedrag (EUR)',
  'Mutatiesoort',
  'Mededelingen',
  'Saldo na mutatie',
  'Tag',
];

/** Fallback when API is unreachable (backend down, etc.) */
const FALLBACK_DB_SCHEMA: { id: string; label: string }[] = [
  { id: 'Date', label: 'Date' },
  { id: 'OwnAccount', label: 'Account number' },
  { id: 'ContraAccount', label: 'Counterparty' },
  { id: 'Amount', label: 'Amount' },
  { id: '_AmountSign', label: 'Debit/Credit' },
  { id: 'Description', label: 'Description' },
  { id: 'BalanceAfter', label: 'Balance after' },
  { id: 'Currency', label: 'Currency' },
  { id: 'Tag', label: 'Tag' },
];

@Component({
  selector: 'app-wizard-poc',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="wizard">
      <header class="wizard-header">
        <a routerLink="/upload" class="back-link">
          <span class="material-symbols-outlined">arrow_back</span>
          Back
        </a>
        <h1>Create new mapping</h1>
        <p class="instruction">
          Drag the fields from the file to the database fields to indicate where the data should be written.
        </p>
      </header>

      <div class="wizard-content">
        <div class="columns">
          <div class="column file-fields-column">
            <h2>Fields in file</h2>
            <p class="column-hint">Drag to the right to link</p>
            <div class="field-list">
              @for (header of availableFileFields(); track header) {
                <div
                  class="field-pill file-pill"
                  draggable="true"
                  (dragstart)="onDragStart($event, header)"
                >
                  <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                  {{ header }}
                </div>
              }
            </div>
          </div>

          <div class="column db-fields-column">
            <h2>Database fields</h2>
            <p class="column-hint">Data from the file is written here</p>
            @if (loadingDbFields()) {
              <mat-spinner diameter="24"></mat-spinner>
            } @else if (dbFields().length > 0) {
            <div class="mapping-card">
              <div class="field-list">
                @for (dbField of dbFields(); track dbField.id) {
                  <div
                    class="mapping-block"
                    [class.has-mapping]="getMapping(dbField.id)()"
                    [class.drag-over]="dragOverTarget() === dbField.id"
                    (dragover)="onDragOver($event, dbField.id)"
                    (dragleave)="onDragLeave()"
                    (drop)="onDrop($event, dbField.id)"
                  >
                    <div class="drop-zone-inner">
                      @if (getMapping(dbField.id)(); as mappedFileField) {
                        <span class="field-pill mapped-pill">
                          {{ mappedFileField }}
                          <span class="material-symbols-outlined remove-btn" (click)="clearMapping(dbField.id); $event.stopPropagation()">close</span>
                        </span>
                      } @else {
                        <span class="drop-placeholder">
                          <span class="material-symbols-outlined">add_circle_outline</span>
                          Drop file field here
                        </span>
                      }
                    </div>
                    <span class="db-field-label">{{ dbField.label }}</span>
                  </div>
                }
              </div>
            </div>
            } @else if (!loadingDbFields()) {
              <p class="error-hint">Could not load database fields.</p>
            }
          </div>
        </div>
      </div>

      <footer class="wizard-footer">
        <button mat-stroked-button routerLink="/upload">Cancel</button>
        <button mat-raised-button color="primary" [disabled]="!canSave()" (click)="onSave()">
          Save
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .wizard {
      display: flex;
      flex-direction: column;
      min-height: calc(100vh - 48px);
      max-width: 1100px;
      margin: 0 auto;
    }
    .wizard-header {
      padding: 24px 0 16px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--mat-sys-primary, #1976d2);
      text-decoration: none;
      font-size: 0.9rem;
      margin-bottom: 16px;
    }
    .back-link:hover { text-decoration: underline; }
    .wizard-header h1 {
      margin: 0 0 8px;
      font-size: 1.5rem;
      font-weight: 500;
    }
    .instruction {
      margin: 0;
      color: #666;
      font-size: 1rem;
    }
    html.theme-dark .instruction { color: rgba(255,255,255,0.7); }
    .wizard-content {
      flex: 1;
      padding: 16px 0;
    }
    .columns {
      display: grid;
      grid-template-columns: max-content minmax(312px, 456px);
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .columns { grid-template-columns: 1fr; }
    }
    .db-fields-column .mapping-card {
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 12px;
      padding: 20px;
      background: #fafafa;
    }
    html.theme-dark .db-fields-column .mapping-card {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.03);
    }
    .mapping-block {
      min-height: 52px;
      padding: 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 2px dashed rgba(0,0,0,0.15);
      border-radius: 8px;
      transition: border-color 0.2s, background 0.2s;
    }
    .mapping-block:last-child { margin-bottom: 0; }
    html.theme-dark .mapping-block { border-color: rgba(255,255,255,0.2); }
    .mapping-block.drag-over,
    .mapping-block.has-mapping {
      border-style: solid;
      border-color: rgba(25, 118, 210, 0.4);
      background: rgba(25, 118, 210, 0.06);
    }
    html.theme-dark .mapping-block.has-mapping {
      border-color: rgba(25, 118, 210, 0.5);
      background: rgba(25, 118, 210, 0.1);
    }
    .mapping-block .db-field-label {
      flex-shrink: 0;
      min-width: 140px;
      font-size: 0.9rem;
      font-weight: 500;
      color: #333;
    }
    html.theme-dark .mapping-block .db-field-label { color: rgba(255,255,255,0.9); }
    .mapping-block .drop-zone-inner {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      min-height: 36px;
    }
    .column h2 {
      margin: 0 0 4px;
      font-size: 1rem;
      font-weight: 500;
    }
    .column-hint {
      margin: 0 0 12px;
      font-size: 0.85rem;
      color: #888;
    }
    html.theme-dark .column-hint { color: rgba(255,255,255,0.5); }
    .error-hint { color: #c62828; font-size: 0.9rem; margin: 0; }
    .field-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .file-fields-column .field-list {
      gap: 8px;
      align-items: flex-start;
    }
    .file-fields-column .file-pill {
      width: fit-content;
    }
    .db-fields-column .field-list { gap: 0; }
    .field-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .file-pill {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      color: #333;
      cursor: grab;
    }
    .file-pill:active { cursor: grabbing; }
    html.theme-dark .file-pill {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.9);
    }
    .db-pill {
      background: #e3f2fd;
      border: 1px solid #90caf9;
      color: #1565c0;
      cursor: grab;
    }
    html.theme-dark .db-pill {
      background: rgba(25, 118, 210, 0.2);
      border-color: rgba(25, 118, 210, 0.5);
      color: #90caf9;
    }
    .db-pill:active { cursor: grabbing; }
    .mapped-pill {
      background: #e8f5e9;
      border: 1px solid #81c784;
      color: #2e7d32;
    }
    html.theme-dark .mapped-pill {
      background: rgba(76, 175, 80, 0.2);
      border-color: rgba(76, 175, 80, 0.5);
      color: #81c784;
    }
    .mapped-pill .remove-btn {
      font-size: 16px;
      cursor: pointer;
      opacity: 0.7;
      margin-left: 4px;
    }
    .mapped-pill .remove-btn:hover { opacity: 1; }
    .drag-handle {
      font-size: 18px;
      opacity: 0.6;
    }
    .drop-placeholder {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #999;
      font-size: 0.9rem;
    }
    html.theme-dark .drop-placeholder { color: rgba(255,255,255,0.4); }
    .drop-placeholder .material-symbols-outlined { font-size: 20px; }
    .wizard-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 24px 0;
      border-top: 1px solid rgba(0,0,0,0.08);
    }
    html.theme-dark .wizard-footer { border-top-color: rgba(255,255,255,0.1); }
  `],
})
export class WizardPocComponent implements OnInit {
  readonly fileHeaders = FILE_HEADERS;
  readonly dbFields = signal<{ id: string; label: string }[]>([]);
  readonly loadingDbFields = signal(true);

  private readonly uploadService = inject(UploadService);
  private readonly mappings = signal<Record<string, string>>({}); // dbFieldId -> fileField

  ngOnInit() {
    this.uploadService.getColumnSchema().subscribe({
      next: (schema) => {
        this.dbFields.set(schema?.length ? schema : FALLBACK_DB_SCHEMA);
        this.loadingDbFields.set(false);
      },
      error: () => {
        this.dbFields.set(FALLBACK_DB_SCHEMA);
        this.loadingDbFields.set(false);
      },
    });
  }

  readonly availableFileFields = computed(() => {
    const mapped = new Set(Object.values(this.mappings()));
    return FILE_HEADERS.filter(h => !mapped.has(h));
  });

  readonly dragOverTarget = signal<string | null>(null);

  getMapping(dbFieldId: string) {
    return () => this.mappings()[dbFieldId] ?? null;
  }

  onDragStart(event: DragEvent, fileField: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({ fileField }));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDragOver(event: DragEvent, dbFieldId: string) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
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
      if (fileField) this.mappings.update(m => ({ ...m, [dbFieldId]: fileField }));
    } catch { /* ignore */ }
  }

  clearMapping(dbFieldId: string) {
    this.mappings.update(m => {
      const next = { ...m };
      delete next[dbFieldId];
      return next;
    });
  }

  canSave(): boolean {
    const m = this.mappings();
    return !!m['Date'] && !!m['Amount'];
  }

  onSave() {
    const m = this.mappings();
    const columnMapping = Object.entries(m).map(([dbField, fileColumn]) => ({ fileColumn, dbField }));
    console.log('Mapping opgeslagen:', columnMapping);
    // TODO: integrate with upload config creation
  }
}
