import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccountStructure } from '../models/account-structure.model';
import { LedgerAccount } from '../models/ledger-account.model';
import { AccountStructureService } from '../services/account-structure.service';
import { LedgerService } from '../services/ledger.service';
import {
  LedgerAccountEditDialogComponent,
  LedgerAccountEditData,
} from './ledger-account-edit-dialog.component';

interface TableRow {
  path: AccountStructure[];
  leaf: AccountStructure | null;
  collapsedAtLevel?: number;
}

const MAX_LEVEL = 4;

@Component({
  selector: 'app-account-structure-tree',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="bulk-actions">
      <button mat-stroked-button (click)="collapseAll()" matTooltip="Collapse all">
        <span class="material-symbols-outlined">unfold_less</span>
        Collapse all
      </button>
      <button mat-stroked-button (click)="expandAll()" matTooltip="Expand all">
        <span class="material-symbols-outlined">unfold_more</span>
        Expand all
      </button>
    </div>
    <div class="table-wrapper">
      <table class="structure-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Account class</th>
            @if (maxDepth() >= 4) {
              <th>Sub-class</th>
            }
            <th>Ledgers</th>
          </tr>
        </thead>
        <tbody>
          @for (row of visibleRows(); track getRowKey(row, $index); let i = $index) {
            <tr>
              @for (col of columnIndices(); track col) {
                @if (shouldShowCell(i, col)) {
                  <td [attr.rowspan]="getRowspan(i, col)" [attr.colspan]="getColspan(i, col) > 1 ? getColspan(i, col) : null">
                    <div class="cell-content" [class.level] [attr.data-level]="col + 1">
                      @if (col < numCols() - 1 && hasChildren(row.path[col])) {
                        <button
                          mat-icon-button
                          class="expand-btn"
                          (click)="toggleCollapse(row.path[col].id)"
                          [matTooltip]="isCollapsed(row.path[col].id) ? 'Expand' : 'Collapse'"
                        >
                          <span class="material-symbols-outlined">
                            {{ isCollapsed(row.path[col].id) ? 'expand_more' : 'expand_less' }}
                          </span>
                        </button>
                      } @else if (col < numCols() - 1) {
                        <span class="expand-placeholder"></span>
                      }
                      <span class="cell-label">{{ getCellName(row, col) }}</span>
                      @if (getCellCode(row, col)) {
                        <span class="code">{{ codeToRange(row.path[col].code) }}</span>
                      }
                    </div>
                  </td>
                }
              }
              @if (row.leaf) {
                <td class="ledgers-cell">
                  <div class="account-class-cell">
                    <div class="account-class-header">
                      <button
                        mat-icon-button
                        class="expand-btn"
                        (click)="toggleLedgersCollapse(row.leaf!.id)"
                        [matTooltip]="isLedgersCollapsed(row.leaf!.id) ? 'Show ledgers' : 'Hide ledgers'"
                      >
                        <span class="material-symbols-outlined">
                          {{ isLedgersCollapsed(row.leaf!.id) ? 'expand_more' : 'expand_less' }}
                        </span>
                      </button>
                      <span class="ledger-count">({{ getLedgers(row.leaf!.id).length }})</span>
                      <button mat-stroked-button class="add-ledger-btn" (click)="addLedger(row.leaf!.id)" matTooltip="New ledger">
                        <span class="material-symbols-outlined">add</span>
                        New ledger
                      </button>
                    </div>
                    @if (!isLedgersCollapsed(row.leaf!.id)) {
                      <div class="ledger-list">
                        @for (ledger of getLedgers(row.leaf!.id); track ledger.id) {
                          <div class="ledger-row">
                            <span class="ledger-code">{{ ledger.code }}</span>
                            <span class="ledger-name">{{ ledger.name }}</span>
                            <button mat-icon-button (click)="editLedger(ledger)" matTooltip="Edit">
                              <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button mat-icon-button (click)="deleteLedger(ledger)" matTooltip="Delete">
                              <span class="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        }
                        @if (getLedgers(row.leaf!.id).length === 0) {
                          <p class="no-ledgers">No ledgers. Click "New ledger" to add one.</p>
                        }
                      </div>
                    }
                  </div>
                </td>
              } @else {
                <td class="ledgers-cell ledgers-cell-empty"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .bulk-actions { display: flex; gap: 8px; margin-bottom: 12px; }
    .bulk-actions button .material-symbols-outlined { font-size: 18px; vertical-align: middle; margin-right: 4px; }
    .table-wrapper { overflow-x: auto; margin: 8px 0; }
    .structure-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .structure-table th {
      text-align: left; padding: 10px 12px; font-weight: 600;
      border-bottom: 1px solid rgba(0,0,0,0.12); background: rgba(0,0,0,0.02);
    }
    html.theme-dark .structure-table th {
      border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
    }
    .structure-table td {
      padding: 6px 12px; vertical-align: top;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    html.theme-dark .structure-table td { border-color: rgba(255,255,255,0.08); }
    .cell-content { display: flex; align-items: center; gap: 4px; min-height: 32px; }
    .cell-content[data-level="1"] .cell-label { font-weight: 600; }
    .cell-content[data-level="2"] .cell-label { font-weight: 500; padding-left: 4px; }
    .cell-content[data-level="3"] .cell-label { padding-left: 8px; }
    .cell-content[data-level="4"] .cell-label { padding-left: 12px; }
    .code { font-family: monospace; margin-left: 6px; font-size: 0.95em; opacity: 0.85; }
    .expand-btn, .expand-placeholder { width: 32px; flex-shrink: 0; }
    .expand-btn .material-symbols-outlined { font-size: 18px; }
    .expand-placeholder { display: inline-block; }
    .cell-label { flex: 1; min-width: 0; }
    .ledgers-cell { padding: 6px 12px; vertical-align: top; border-bottom: 1px solid rgba(0,0,0,0.06); min-width: 280px; }
    html.theme-dark .ledgers-cell { border-color: rgba(255,255,255,0.08); }
    .ledgers-cell-empty { background: transparent; }
    .account-class-cell { display: flex; flex-direction: column; gap: 8px; }
    .account-class-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .account-class-header .expand-btn { flex-shrink: 0; }
    .ledger-count { font-size: 0.9em; color: #757575; }
    .add-ledger-btn .material-symbols-outlined { font-size: 18px; margin-right: 4px; }
    .ledger-list { display: flex; flex-direction: column; gap: 2px; padding-left: 8px; border-left: 2px solid rgba(0,0,0,0.08); }
    html.theme-dark .ledger-list { border-color: rgba(255,255,255,0.12); }
    .ledger-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
    .ledger-row .ledger-code { font-family: monospace; min-width: 48px; }
    .ledger-row .ledger-name { flex: 1; min-width: 0; }
    .no-ledgers { margin: 8px 0 0 0; font-size: 0.9em; color: #757575; }
  `],
})
export class AccountStructureTreeComponent {
  readonly tree = input.required<AccountStructure[]>();
  readonly ledgerAccounts = input<LedgerAccount[]>([]);
  readonly saved = output<void>();
  readonly deleted = output<void>();

  private readonly collapsed = signal<Set<number>>(new Set());
  /** Account class ids for which the ledger list is collapsed. */
  private readonly collapsedLedgers = signal<Set<number>>(new Set());
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly accountStructureService = inject(AccountStructureService);
  private readonly ledgerService = inject(LedgerService);

  readonly maxDepth = computed(() => {
    let max = 0;
    const walk = (n: AccountStructure, d: number) => {
      max = Math.max(max, d);
      n.children?.forEach((c) => walk(c, d + 1));
    };
    this.tree().forEach((r) => walk(r, 1));
    return max;
  });

  readonly numCols = computed(() => this.maxDepth());
  readonly columnIndices = computed(() => Array.from({ length: this.numCols() }, (_, i) => i));

  readonly visibleRows = computed(() => {
    const roots = this.tree();
    const coll = this.collapsed();
    const rows: TableRow[] = [];
    const walk = (path: AccountStructure[], node: AccountStructure) => {
      const p = [...path, node];
      const isLeaf = (node.children?.length ?? 0) === 0;
      if (isLeaf) {
        const padded = [...p];
        while (padded.length < MAX_LEVEL) padded.push(node);
        rows.push({ path: padded, leaf: node });
      } else if (coll.has(node.id)) {
        const fullPath: AccountStructure[] = [...p];
        while (fullPath.length < MAX_LEVEL) fullPath.push(node);
        rows.push({ path: fullPath, leaf: null, collapsedAtLevel: node.level });
      } else if (node.children?.length) {
        for (const c of node.children) walk(p, c);
      }
    };
    for (const r of roots) walk([], r);
    return rows;
  });

  toggleCollapse(id: number): void {
    this.collapsed.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  collapseAll(): void {
    const ids = new Set<number>();
    const collect = (node: AccountStructure) => {
      if ((node.children?.length ?? 0) > 0) ids.add(node.id);
      node.children?.forEach(collect);
    };
    this.tree().forEach(collect);
    this.collapsed.set(ids);
  }

  expandAll(): void {
    this.collapsed.set(new Set());
  }

  isCollapsed(id: number): boolean {
    return this.collapsed().has(id);
  }

  hasChildren(node: AccountStructure): boolean {
    return (node.children?.length ?? 0) > 0;
  }

  shouldShowCell(rowIndex: number, colIndex: number): boolean {
    const rows = this.visibleRows();
    if (rowIndex >= rows.length) return false;
    const row = rows[rowIndex];
    const prev = rowIndex > 0 ? rows[rowIndex - 1] : null;
    if (row.leaf === null && row.collapsedAtLevel !== undefined) {
      if (colIndex < row.collapsedAtLevel - 1) {
        if (rowIndex === 0) return true;
        return row.path[colIndex].id !== prev!.path[colIndex].id;
      }
      if (colIndex === row.collapsedAtLevel - 1) return true;
      return false;
    }
    if (rowIndex === 0) return true;
    return row.path[colIndex].id !== prev!.path[colIndex].id;
  }

  getRowspan(rowIndex: number, colIndex: number): number {
    const rows = this.visibleRows();
    if (rowIndex >= rows.length) return 1;
    const row = rows[rowIndex];
    const id = row.path[colIndex].id;
    let span = 1;
    for (let i = rowIndex + 1; i < rows.length; i++) {
      if (rows[i].path[colIndex].id !== id) break;
      span++;
    }
    if (row.leaf === null && row.collapsedAtLevel !== undefined && colIndex >= row.collapsedAtLevel - 1) return 1;
    return span;
  }

  getColspan(rowIndex: number, colIndex: number): number {
    const rows = this.visibleRows();
    if (rowIndex >= rows.length) return 1;
    const row = rows[rowIndex];
    if (row.leaf === null && row.collapsedAtLevel !== undefined && colIndex === row.collapsedAtLevel - 1) {
      return this.numCols() - colIndex;
    }
    return 1;
  }

  getCellName(row: TableRow, col: number): string {
    const node = row.path[col];
    return node ? node.name : '';
  }

  getCellCode(row: TableRow, col: number): string | undefined {
    const node = row.path[col];
    return node ? node.code : undefined;
  }

  /** Convert structure code to 5-digit display range (e.g. "1" → 10000–19999, "123" → 12300–12399). */
  codeToRange(code: string): string {
    if (!code || !/^\d+$/.test(code)) return code;
    const len = code.length;
    if (len >= 5) return code;
    const pad = 5 - len;
    const low = code + '0'.repeat(pad);
    const high = code + '9'.repeat(pad);
    return `${low}-${high}`;
  }

  getRowKey(row: TableRow, index: number): string | number {
    if (row.leaf) return row.leaf.id;
    if (row.collapsedAtLevel !== undefined) {
      const node = row.path[row.collapsedAtLevel - 1];
      return `c-${node?.id ?? index}`;
    }
    return index;
  }

  getLedgers(accountStructureId: number): LedgerAccount[] {
    return this.ledgerAccounts().filter((l) => l.accountStructureId === accountStructureId);
  }

  isLedgersCollapsed(accountClassId: number): boolean {
    return this.collapsedLedgers().has(accountClassId);
  }

  toggleLedgersCollapse(accountClassId: number): void {
    this.collapsedLedgers.update((s) => {
      const n = new Set(s);
      if (n.has(accountClassId)) n.delete(accountClassId);
      else n.add(accountClassId);
      return n;
    });
  }

  addLedger(accountClassId: number): void {
    this.accountStructureService.getAccountClasses().subscribe({
      next: (classes) => {
        const ref = this.dialog.open(LedgerAccountEditDialogComponent, {
          data: {
            accountClasses: classes,
            initialAccountStructureId: accountClassId,
          } as LedgerAccountEditData,
          width: '420px',
        });
        ref.afterClosed().subscribe((r) => {
          if (r) this.saved.emit();
        });
      },
    });
  }

  editLedger(ledger: LedgerAccount): void {
    this.accountStructureService.getAccountClasses().subscribe({
      next: (classes) => {
        const ref = this.dialog.open(LedgerAccountEditDialogComponent, {
          data: { item: ledger, accountClasses: classes } as LedgerAccountEditData,
          width: '420px',
        });
        ref.afterClosed().subscribe((r) => {
          if (r) this.saved.emit();
        });
      },
    });
  }

  deleteLedger(ledger: LedgerAccount): void {
    if (!confirm(`Delete "${ledger.name}"?`)) return;
    this.ledgerService.delete(ledger.id).subscribe({
      next: () => {
        this.snackBar.open('Ledger deleted', undefined, { duration: 3000 });
        this.deleted.emit();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.error ?? err?.message ?? 'Delete failed', undefined, { duration: 5000 });
      },
    });
  }
}
