import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccountStructure } from '../models/account-structure.model';

interface TableRow {
  path: AccountStructure[];
  leaf: AccountStructure | null;
  collapsedAtLevel?: number;
}

const MAX_LEVEL = 4;

@Component({
  selector: 'app-account-structure-tree',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTooltipModule],
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
                        <span class="code">{{ row.path[col].code }}</span>
                      }
                    </div>
                  </td>
                }
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
  `],
})
export class AccountStructureTreeComponent {
  readonly tree = input.required<AccountStructure[]>();
  private readonly collapsed = signal<Set<number>>(new Set());

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

  getRowKey(row: TableRow, index: number): string | number {
    if (row.leaf) return row.leaf.id;
    if (row.collapsedAtLevel !== undefined) {
      const node = row.path[row.collapsedAtLevel - 1];
      return `c-${node?.id ?? index}`;
    }
    return index;
  }
}
