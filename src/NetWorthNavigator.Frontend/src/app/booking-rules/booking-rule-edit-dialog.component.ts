import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BookingRule, MATCH_FIELDS, MATCH_OPERATORS } from '../models/booking-rule.model';
import { LedgerService } from '../services/ledger.service';
import { LedgerAccount } from '../models/ledger-account.model';

export interface BookingRuleEditDialogData {
  rule?: BookingRule;
}

interface CriterionRow {
  field: string;
  operator: string;
  value: string;
}

interface LineItemRow {
  ledgerAccountId: number | null;
  amountType: 'OppositeOfLine1' | 'Zero';
}

@Component({
  selector: 'app-booking-rule-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.rule ? 'Edit rule' : 'Add rule' }}</h2>
    <mat-dialog-content>
      <form class="form">
        <!-- Rule name -->
        <div class="section rule-name-section">
          <label class="section-label">Rule name</label>
          <div class="rule-name-row">
            <mat-form-field appearance="outline" class="rule-name-field">
              <mat-label>Rule name</mat-label>
              <input matInput [(ngModel)]="form.name" name="name" placeholder="e.g. Hypotheek 2017 deel 1.0" required>
            </mat-form-field>
            @if (data.rule) {
              <mat-checkbox [(ngModel)]="form.isActive" name="isActive" class="active-checkbox">Active</mat-checkbox>
              <button type="button" mat-icon-button (click)="deleteRule()" matTooltip="Delete rule" class="delete-rule-btn">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        </div>

        <!-- Criteria -->
        <div class="section">
          <label class="section-label">Criteria</label>
          <p class="section-hint">Wanneer voldoen transactieregels aan deze voorwaarden?</p>
          <div class="table-wrap">
            <table class="criteria-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Operator</th>
                  <th>Value</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                @for (c of form.criteria; track $index) {
                  <tr>
                    <td>
                      <mat-form-field appearance="outline" class="cell-field">
                        <mat-select [(ngModel)]="c.field" [ngModelOptions]="{standalone: true}" (ngModelChange)="onCriteriaChange()">
                          @for (f of matchFields; track f.id) {
                            <mat-option [value]="f.id">{{ f.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </td>
                    <td>
                      <mat-form-field appearance="outline" class="cell-field">
                        <mat-select [(ngModel)]="c.operator" [ngModelOptions]="{standalone: true}" (ngModelChange)="onCriteriaChange()">
                          @for (op of matchOperators; track op.id) {
                            <mat-option [value]="op.id">{{ op.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </td>
                    <td>
                      <mat-form-field appearance="outline" class="cell-field">
                        <input matInput [(ngModel)]="c.value" [ngModelOptions]="{standalone: true}" (ngModelChange)="onCriteriaChange()"
                          [placeholder]="c.field === 'OwnAccount' ? 'e.g. ING Huishoudpot' : 'e.g. 2017 deel 1.0'">
                      </mat-form-field>
                    </td>
                    <td class="col-action">
                      <button type="button" mat-icon-button (click)="removeCriterion($index)" [disabled]="form.criteria.length <= 1" matTooltip="Remove criterion">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <button type="button" mat-stroked-button (click)="addCriterion()" class="add-btn">
            <mat-icon>add</mat-icon>
            Add criteria
          </button>
          @if (form.criteria.length > 1) {
            <p class="criteria-note">Momenteel wordt alleen het eerste criterium gebruikt.</p>
          }
        </div>

        <!-- Line items (resultaat) -->
        <div class="section">
          <label class="section-label">Line items</label>
          <p class="section-hint">Wat moet er geboekt worden wanneer aan de criteria wordt voldaan? Minimaal 1, meerdere toevoegen kan.</p>
          <div class="table-wrap">
            <table class="line-items-table">
              <thead>
                <tr>
                  <th>Ledger</th>
                  <th>Amount</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                @for (line of form.lineItems; track $index) {
                  <tr>
                    <td>
                      <mat-form-field appearance="outline" class="cell-field">
                        <mat-select [(ngModel)]="line.ledgerAccountId" [ngModelOptions]="{standalone: true}">
                          <mat-option [value]="null">— Select —</mat-option>
                          @for (la of ledgerAccounts; track la.id) {
                            <mat-option [value]="la.id">{{ la.code }} {{ la.name }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </td>
                    <td>
                      @if (form.matchField !== 'OwnAccount') {
                        <mat-form-field appearance="outline" class="cell-field">
                          <mat-select [(ngModel)]="line.amountType" [ngModelOptions]="{standalone: true}">
                            <mat-option value="OppositeOfLine1">Tegenpost van regel 1</mat-option>
                            <mat-option value="Zero">0 (later invullen)</mat-option>
                          </mat-select>
                        </mat-form-field>
                      } @else {
                        <span class="amount-hint">—</span>
                      }
                    </td>
                    <td class="col-action">
                      <button type="button" mat-icon-button (click)="removeLineItem($index)" [disabled]="form.lineItems.length <= 1" matTooltip="Remove line item">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <button type="button" mat-stroked-button (click)="addLineItem()" class="add-btn" [disabled]="form.lineItems.length >= 2">
            <mat-icon>add</mat-icon>
            Add line item
          </button>
          <p class="line-items-note">Bij 1 line item: tegenpost van regel 1. Bij 2 line items: beide bedragen 0 (bv. rente + aflossing later invullen).</p>
        </div>

        <!-- Options -->
        <div class="section options-section">
          <mat-checkbox [(ngModel)]="form.requiresReview" name="requiresReview">Requires review</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; min-width: 420px; max-width: 560px; }
    .section { margin-bottom: 20px; }
    .section-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--mat-sys-on-surface-variant, #666); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .section-hint { margin: 0 0 10px; font-size: 0.85rem; color: var(--mat-sys-on-surface-variant, #666); }
    .rule-name-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .rule-name-field { flex: 1; min-width: 200px; }
    .active-checkbox { margin-right: 8px; }
    .delete-rule-btn { color: var(--mat-sys-error, #b00020); }
    .table-wrap { overflow-x: auto; margin-bottom: 8px; }
    .criteria-table, .line-items-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .criteria-table th, .criteria-table td, .line-items-table th, .line-items-table td { padding: 4px 8px; vertical-align: middle; }
    .criteria-table th, .line-items-table th { text-align: left; font-weight: 600; color: var(--mat-sys-on-surface-variant, #666); font-size: 0.75rem; text-transform: uppercase; }
    .col-action { width: 48px; text-align: right; }
    .cell-field { width: 100%; min-width: 120px; }
    .cell-field .mat-mdc-form-field { width: 100%; }
    .add-btn { margin-top: 4px; }
    .add-btn mat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 4px; vertical-align: middle; }
    .criteria-note { margin: 6px 0 0; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant, #666); }
    .line-items-note { margin: 8px 0 0; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant, #666); }
    .options-section { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  `],
})
export class BookingRuleEditDialogComponent {
  private readonly ref = inject(MatDialogRef<BookingRuleEditDialogComponent>);
  private readonly ledgerService = inject(LedgerService);
  readonly data = inject<BookingRuleEditDialogData>(MAT_DIALOG_DATA);
  readonly matchFields = MATCH_FIELDS;
  readonly matchOperators = MATCH_OPERATORS;

  ledgerAccounts: LedgerAccount[] = [];

  /** First criterion drives matchField/matchOperator/matchValue (backend has single criterion). */
  form = this.buildForm();

  constructor() {
    this.ledgerService.getAll().subscribe((list) => (this.ledgerAccounts = list));
  }

  private buildForm() {
    const r = this.data.rule;
    const matchField = r?.matchField ?? 'ContraAccountName';
    const matchOperator = r?.matchOperator ?? 'Contains';
    const matchValue = r?.matchValue ?? '';
    const hasSecond = (r?.secondLedgerAccountId ?? 0) > 0;
    return {
      name: r?.name ?? '',
      criteria: [{ field: matchField, operator: matchOperator, value: matchValue }] as CriterionRow[],
      matchField,
      matchOperator,
      matchValue,
      lineItems: hasSecond
        ? [
            { ledgerAccountId: r!.ledgerAccountId as number | null, amountType: 'Zero' as const },
            { ledgerAccountId: r!.secondLedgerAccountId as number | null, amountType: 'Zero' as const },
          ]
        : [{ ledgerAccountId: (r?.ledgerAccountId ?? null) as number | null, amountType: (r ? 'OppositeOfLine1' : 'OppositeOfLine1') as 'OppositeOfLine1' | 'Zero' }] as LineItemRow[],
      isActive: r?.isActive ?? true,
      requiresReview: r?.requiresReview ?? true,
    };
  }

  onCriteriaChange(): void {
    const c = this.form.criteria[0];
    if (c) {
      this.form.matchField = c.field;
      this.form.matchOperator = c.operator;
      this.form.matchValue = c.value;
    }
  }

  addCriterion(): void {
    this.form.criteria.push({ field: 'ContraAccountName', operator: 'Contains', value: '' });
  }

  removeCriterion(index: number): void {
    if (this.form.criteria.length <= 1) return;
    this.form.criteria.splice(index, 1);
    const c = this.form.criteria[0];
    if (c) {
      this.form.matchField = c.field;
      this.form.matchOperator = c.operator;
      this.form.matchValue = c.value;
    }
  }

  addLineItem(): void {
    if (this.form.lineItems.length >= 2) return;
    this.form.lineItems.push({ ledgerAccountId: null, amountType: 'Zero' });
  }

  removeLineItem(index: number): void {
    if (this.form.lineItems.length <= 1) return;
    this.form.lineItems.splice(index, 1);
  }

  deleteRule(): void {
    if (confirm('Delete this rule?')) this.ref.close({ delete: true });
  }

  canSave(): boolean {
    if (!this.form.name?.trim()) return false;
    const c = this.form.criteria[0];
    if (!c) return false;
    const firstLine = this.form.lineItems[0];
    return firstLine?.ledgerAccountId != null;
  }

  save(): void {
    const c = this.form.criteria[0];
    if (!c || !this.form.name?.trim()) return;
    const first = this.form.lineItems[0];
    if (!first?.ledgerAccountId) return;
    const second = this.form.lineItems[1];
    const secondLedgerId = second?.ledgerAccountId && second.ledgerAccountId > 0 ? second.ledgerAccountId : undefined;
    this.ref.close({
      name: this.form.name.trim(),
      matchField: c.field,
      matchOperator: c.operator,
      matchValue: c.value?.trim() ?? '',
      ledgerAccountId: first.ledgerAccountId,
      secondLedgerAccountId: secondLedgerId,
      isActive: this.form.isActive ?? true,
      requiresReview: this.form.requiresReview ?? true,
    });
  }
}
