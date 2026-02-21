import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookingRule, MATCH_FIELDS, MATCH_OPERATORS } from '../models/booking-rule.model';
import { LedgerService } from '../services/ledger.service';
import { BookingRulesService } from '../services/booking-rules.service';
import { BookingsService } from '../services/bookings.service';
import { LedgerAccount } from '../models/ledger-account.model';
import { LedgerAccountSelectComponent } from '../components/ledger-account-select/ledger-account-select.component';

export type ApplyRuleTo = '' | 'this' | 'all';

interface CriterionRow {
  field: string;
  operator: string;
  value: string;
}

interface LineItemRow {
  ledgerAccountId: number | null;
  amountType: 'OppositeOfLine1' | 'Zero';
}

/** State passed when navigating from a booking to create a rule (prefill). Ledger is never prefilled. */
export interface FromBookingPrefill {
  ownAccount?: string;
  contraAccount?: string;
  contraAccountName?: string;
  description?: string;
  amount?: number;
  currency?: string;
  /** Transaction document line id (for "Apply to this booking"). */
  documentLineId?: string;
}

@Component({
  selector: 'app-booking-rule-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    LedgerAccountSelectComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit rule' : 'Add rule' }}</h1>
      </div>

      <mat-card class="form-card">
        <mat-card-content>
          <form class="form">
            <!-- Rule name -->
            <div class="section rule-name-section">
              <label class="section-label">Rule name</label>
              <div class="rule-name-row">
                <mat-form-field appearance="outline" class="rule-name-field">
                  <mat-label>Rule name *</mat-label>
                  <input matInput [(ngModel)]="form.name" name="name" placeholder="e.g. Mortgage 2017 part 1.0" required>
                </mat-form-field>
                @if (isEdit) {
                  <mat-checkbox [(ngModel)]="form.isActive" name="isActive" class="active-checkbox">Active</mat-checkbox>
                  <button type="button" mat-icon-button (click)="deleteRule()" matTooltip="Delete rule" class="delete-rule-btn">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                }
              </div>
            </div>

            <!-- Criteria -->
            <div class="section">
              <label class="section-label">Criteria</label>
              <p class="section-hint">When do transaction lines meet these conditions?</p>
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
                              [placeholder]="c.field === 'OwnAccount' ? 'e.g. ING Household' : 'e.g. 2017 part 1.0'">
                          </mat-form-field>
                        </td>
                        <td class="col-action">
                          @if (form.criteria.length > 1) {
                            <button type="button" mat-icon-button (click)="removeCriterion($index)" matTooltip="Remove criterion">
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <button type="button" mat-stroked-button (click)="addCriterion()" class="add-btn">
                <span class="material-symbols-outlined">add</span>
                Add criteria
              </button>
              <p class="criteria-note">All criteria must match. More specific rules (more criteria) are applied first.</p>
            </div>

            <!-- Line items -->
            <div class="section">
              <label class="section-label">Line items</label>
              <p class="section-hint">What should be booked when the criteria are met? Line 1 is always the own-account ledger. Add contra lines below (2, 3, 4…).</p>
              <div class="table-wrap">
                <table class="line-items-table">
                  <thead>
                    <tr>
                      <th class="nr-col">Nr</th>
                      <th>Ledger</th>
                      <th>Amount</th>
                      <th class="col-action"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (line of form.lineItems; track $index; let i = $index) {
                      <tr>
                        <td class="nr-col mono">{{ i + 2 }}</td>
                        <td>
                          <app-ledger-account-select
                            [accounts]="ledgerAccounts"
                            [value]="line.ledgerAccountId"
                            (valueChange)="line.ledgerAccountId = $event"
                            placeholder="Type to filter..." />
                        </td>
                        <td>
                          @if (form.matchField !== 'OwnAccount') {
                            <mat-form-field appearance="outline" class="cell-field">
                              <mat-select [(ngModel)]="line.amountType" [ngModelOptions]="{standalone: true}">
                                <mat-option value="OppositeOfLine1">Contra of line 1</mat-option>
                                <mat-option value="Zero">0 (fill in later)</mat-option>
                              </mat-select>
                            </mat-form-field>
                          } @else {
                            <span class="amount-hint">—</span>
                          }
                        </td>
                        <td class="col-action">
                          <button type="button" mat-icon-button (click)="moveLineItemUp(i)" [disabled]="i === 0" matTooltip="Move up">
                            <span class="material-symbols-outlined">arrow_upward</span>
                          </button>
                          <button type="button" mat-icon-button (click)="moveLineItemDown(i)" [disabled]="i === form.lineItems.length - 1" matTooltip="Move down">
                            <span class="material-symbols-outlined">arrow_downward</span>
                          </button>
                          @if (form.lineItems.length > 1) {
                            <button type="button" mat-icon-button (click)="removeLineItem(i)" matTooltip="Remove line item">
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <button type="button" mat-stroked-button (click)="addLineItem()" class="add-btn">
                <span class="material-symbols-outlined">add</span>
                Add line item
              </button>
              <p class="line-items-note">First line item: contra of line 1. Additional lines: amount 0 (e.g. interest + principal to fill in later).</p>
            </div>

            <!-- Apply to... (after save) -->
            <div class="section apply-section">
              <label class="section-label">Apply to...</label>
              <p class="section-hint">After saving, optionally apply this rule to existing transaction lines by recreating their bookings.</p>
              <mat-form-field appearance="outline" class="apply-field">
                <mat-label>Apply to...</mat-label>
                <mat-select [(ngModel)]="form.applyTo" name="applyTo">
                  @if (prefillFromBooking?.documentLineId) {
                    <mat-option value="this">This booking (the transaction you came from)</mat-option>
                  }
                  <mat-option value="all">All bookings</mat-option>
                  <mat-option value="">Don't apply now</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

        <!-- Options -->
        <div class="section options-section">
          <mat-checkbox [(ngModel)]="form.requiresReview" name="requiresReview">Requires review</mat-checkbox>
        </div>
          </form>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-button (click)="cancel()">Cancel</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="!canSave() || saving">Save</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { width: 100%; max-width: 100%; margin: 0; padding: 24px; box-sizing: border-box; }
    .page-header { margin-bottom: 24px; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 500; }
    .form-card { padding: 24px; }
    .form { display: flex; flex-direction: column; }
    .section { margin-bottom: 24px; }
    .section-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--mat-sys-on-surface-variant, #666); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .section-hint { margin: 0 0 10px; font-size: 0.85rem; color: var(--mat-sys-on-surface-variant, #666); }
    .rule-name-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .rule-name-field { flex: 1; min-width: 220px; }
    .active-checkbox { margin-right: 8px; }
    .delete-rule-btn { color: var(--mat-sys-error, #b00020); }
    .table-wrap { overflow-x: auto; margin-bottom: 8px; }
    .criteria-table, .line-items-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .criteria-table th, .criteria-table td, .line-items-table th, .line-items-table td { padding: 4px 8px; vertical-align: middle; }
    .criteria-table th, .line-items-table th { text-align: left; font-weight: 600; color: var(--mat-sys-on-surface-variant, #666); font-size: 0.75rem; text-transform: uppercase; }
    .line-items-table .nr-col { width: 40px; text-align: right; }
    .col-action { width: 48px; text-align: right; }
    .col-action .material-symbols-outlined { font-size: 24px; }
    .cell-field { width: 100%; min-width: 140px; }
    .cell-field .mat-mdc-form-field { width: 100%; }
    .add-btn { margin-top: 4px; }
    .add-btn .material-symbols-outlined { font-size: 20px; width: 20px; height: 20px; margin-right: 4px; vertical-align: middle; }
    .criteria-note { margin: 6px 0 0; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant, #666); }
    .line-items-note { margin: 8px 0 0; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant, #666); }
    .apply-section { }
    .apply-field { min-width: 320px; }
    .options-section { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    mat-card-actions { padding: 16px 24px; }
  `],
})
export class BookingRuleFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ledgerService = inject(LedgerService);
  private readonly rulesService = inject(BookingRulesService);
  private readonly bookingsService = inject(BookingsService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly router = inject(Router);
  /** Prefill from "Create booking rule" on a booking; set from router state at navigation time. */
  readonly prefillFromBooking: FromBookingPrefill | null = this.router.getCurrentNavigation()?.extras?.state?.['fromBooking'] ?? null;

  readonly matchFields = MATCH_FIELDS;
  readonly matchOperators = MATCH_OPERATORS;
  ledgerAccounts: LedgerAccount[] = [];
  isEdit = false;
  ruleId: number | null = null;
  saving = false;

  form = this.buildForm(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        this.ruleId = numId;
        this.isEdit = true;
        this.ledgerService.getAll().subscribe((list) => (this.ledgerAccounts = list));
        this.rulesService.getAll().subscribe((rules) => {
          const rule = rules.find((r) => r.id === numId);
          if (rule) {
            this.form = this.buildForm(rule);
          }
        });
        return;
      }
    }
    this.ledgerService.getAll().subscribe((list) => {
      this.ledgerAccounts = list;
      if (this.prefillFromBooking) {
        this.applyPrefillFromBooking();
        if (this.prefillFromBooking.documentLineId) this.form.applyTo = 'this';
      }
    });
  }

  private applyPrefillFromBooking(): void {
    const p = this.prefillFromBooking!;
    const criteria: CriterionRow[] = [];
    const order: { field: 'OwnAccount' | 'ContraAccount' | 'ContraAccountName' | 'Description'; operator: string; getValue: () => string }[] = [
      { field: 'OwnAccount', operator: 'Equals', getValue: () => (p.ownAccount ?? '').trim() },
      { field: 'ContraAccount', operator: 'Equals', getValue: () => (p.contraAccount ?? '').trim() },
      { field: 'ContraAccountName', operator: 'Contains', getValue: () => (p.contraAccountName ?? '').trim() },
      { field: 'Description', operator: 'Contains', getValue: () => (p.description ?? '').trim() },
    ];
    for (const { field, operator, getValue } of order) {
      const value = getValue();
      if (value.length > 0) {
        criteria.push({ field, operator, value: field === 'Description' ? value.slice(0, 500) : value });
      }
    }
    if (criteria.length > 0) {
      this.form.criteria = criteria;
      const first = criteria[0];
      this.form.matchField = first.field;
      this.form.matchOperator = first.operator;
      this.form.matchValue = first.value;
    }
    if (this.form.name === '') {
      this.form.name = (p.contraAccountName ?? p.description?.slice(0, 40) ?? 'New rule').trim() || 'New rule';
    }
  }

  private buildForm(r: BookingRule | null) {
    const criteriaList = r?.criteria && r.criteria.length > 0
      ? r.criteria.map(c => ({ field: c.matchField, operator: c.matchOperator, value: c.matchValue }))
      : [{ field: r?.matchField ?? 'ContraAccountName', operator: r?.matchOperator ?? 'Contains', value: r?.matchValue ?? '' }];
    const first = criteriaList[0];
    const apiLineItems = r?.lineItems;
    const hasSecond = (r?.secondLedgerAccountId ?? 0) > 0;
    const lineItemsFromApi = apiLineItems && apiLineItems.length > 0
      ? apiLineItems.map(li => ({ ledgerAccountId: li.ledgerAccountId as number | null, amountType: (li.amountType === 'Zero' ? 'Zero' : 'OppositeOfLine1') as 'OppositeOfLine1' | 'Zero' }))
      : hasSecond && r
        ? [
            { ledgerAccountId: r.ledgerAccountId as number | null, amountType: 'Zero' as const },
            { ledgerAccountId: r.secondLedgerAccountId as number | null, amountType: 'Zero' as const },
          ]
        : [{ ledgerAccountId: (r?.ledgerAccountId ?? null) as number | null, amountType: 'OppositeOfLine1' as const }];
    return {
      name: r?.name ?? '',
      criteria: criteriaList as CriterionRow[],
      matchField: first?.field ?? 'ContraAccountName',
      matchOperator: first?.operator ?? 'Contains',
      matchValue: first?.value ?? '',
      lineItems: lineItemsFromApi as LineItemRow[],
      isActive: r?.isActive ?? true,
      requiresReview: r?.requiresReview ?? true,
      applyTo: '' as ApplyRuleTo,
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
    this.form.lineItems.push({ ledgerAccountId: null, amountType: 'Zero' });
  }

  removeLineItem(index: number): void {
    if (this.form.lineItems.length <= 1) return;
    this.form.lineItems.splice(index, 1);
  }

  moveLineItemUp(index: number): void {
    if (index <= 0) return;
    const arr = this.form.lineItems;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
  }

  moveLineItemDown(index: number): void {
    if (index >= this.form.lineItems.length - 1) return;
    const arr = this.form.lineItems;
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
  }

  cancel(): void {
    if (this.prefillFromBooking) {
      this.router.navigate(['/bookings']);
    } else {
      this.router.navigate(['/booking-rules']);
    }
  }

  deleteRule(): void {
    if (!this.ruleId || !confirm('Delete this rule?')) return;
    this.rulesService.delete(this.ruleId).subscribe({
      next: () => {
        this.snackBar.open('Rule deleted', undefined, { duration: 2000 });
        this.router.navigate(['/booking-rules']);
      },
      error: (err) => this.snackBar.open(err?.error?.error ?? 'Failed to delete rule', undefined, { duration: 4000 }),
    });
  }

  canSave(): boolean {
    if (!this.form.name?.trim()) return false;
    const c = this.form.criteria[0];
    if (!c) return false;
    const firstLine = this.form.lineItems[0];
    return firstLine?.ledgerAccountId != null;
  }

  save(): void {
    if (!this.form.criteria.length || !this.form.name?.trim()) return;
    const first = this.form.lineItems[0];
    if (!first?.ledgerAccountId) return;
    const criteria = this.form.criteria.map(c => ({
      matchField: c.field,
      matchOperator: c.operator,
      matchValue: c.value?.trim() ?? '',
    }));
    const lineItems = this.form.lineItems
      .filter(li => li.ledgerAccountId != null && li.ledgerAccountId > 0)
      .map(li => ({ ledgerAccountId: li.ledgerAccountId!, amountType: li.amountType }));
    const payload = {
      name: this.form.name.trim(),
      criteria,
      matchField: criteria[0]?.matchField ?? 'ContraAccountName',
      matchOperator: criteria[0]?.matchOperator ?? 'Contains',
      matchValue: criteria[0]?.matchValue ?? '',
      ledgerAccountId: first.ledgerAccountId,
      secondLedgerAccountId: this.form.lineItems[1]?.ledgerAccountId && this.form.lineItems[1].ledgerAccountId > 0 ? this.form.lineItems[1].ledgerAccountId : undefined,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      isActive: this.form.isActive ?? true,
      requiresReview: this.form.requiresReview ?? true,
    };

    this.saving = true;
    const doAfterSave = () => {
      const applyTo = (this.form.applyTo ?? '') as ApplyRuleTo;
      if (!applyTo) {
        this.router.navigate(this.prefillFromBooking ? ['/bookings'] : ['/booking-rules']);
        return;
      }
      const scope = applyTo === 'this' ? 'ThisBooking' : 'All';
      const docLineId = applyTo === 'this' && this.prefillFromBooking?.documentLineId ? this.prefillFromBooking.documentLineId : undefined;
      this.bookingsService.recreateByScope(scope, docLineId).subscribe({
        next: (result) => {
          let msg = `Rule saved. Applied to ${result.processed} transaction(s), ${result.created} booking(s) created.`;
          if (result.errors?.length) msg += ` ${result.errors.length} error(s).`;
          this.snackBar.open(msg, undefined, { duration: result.errors?.length ? 6000 : 4000 });
          this.router.navigate(this.prefillFromBooking ? ['/bookings'] : ['/booking-rules']);
        },
        error: (err) => {
          this.snackBar.open(err?.error?.error ?? 'Rule saved but apply failed', undefined, { duration: 4000 });
          this.router.navigate(this.prefillFromBooking ? ['/bookings'] : ['/booking-rules']);
        },
      });
    };
    if (this.isEdit && this.ruleId != null) {
      this.rulesService.update(this.ruleId, payload).subscribe({
        next: (res) => {
          this.saving = false;
          this.snackBar.open('Rule updated', undefined, { duration: 2000 });
          doAfterSave();
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to update rule', undefined, { duration: 4000 });
        },
      });
    } else {
      this.rulesService.create(payload).subscribe({
        next: (res) => {
          this.saving = false;
          this.snackBar.open('Rule added', undefined, { duration: 2000 });
          doAfterSave();
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to add rule', undefined, { duration: 4000 });
        },
      });
    }
  }
}
