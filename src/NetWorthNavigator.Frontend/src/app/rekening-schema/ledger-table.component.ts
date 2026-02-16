import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LedgerAccount } from '../models/ledger-account.model';
import { AccountStructureService } from '../services/account-structure.service';
import { LedgerService } from '../services/ledger.service';
import {
  LedgerAccountEditDialogComponent,
  LedgerAccountEditData,
} from './ledger-account-edit-dialog.component';

@Component({
  selector: 'app-ledger-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTooltipModule, MatTableModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="table-actions">
      <button mat-stroked-button (click)="addAccount()" matTooltip="Add new ledger account">
        <span class="material-symbols-outlined">add</span>
        New account
      </button>
    </div>
    <table mat-table [dataSource]="accounts()" class="ledger-table">
      <ng-container matColumnDef="code">
        <th mat-header-cell *matHeaderCellDef>Code</th>
        <td mat-cell *matCellDef="let row">{{ row.code }}</td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let row">{{ row.name }}</td>
      </ng-container>
      <ng-container matColumnDef="accountClass">
        <th mat-header-cell *matHeaderCellDef>Account class</th>
        <td mat-cell *matCellDef="let row">{{ row.accountStructureName }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let row">
          <button mat-icon-button (click)="editAccount(row)" matTooltip="Edit">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button mat-icon-button (click)="deleteAccount(row)" matTooltip="Delete">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      <tr class="mat-row" *matNoDataRow>
        <td class="mat-cell" colspan="4">No ledger accounts yet. Click "New account" to add one.</td>
      </tr>
    </table>
  `,
  styles: [`
    .table-actions { margin-bottom: 12px; }
    .table-actions button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .ledger-table { width: 100%; }
  `],
})
export class LedgerTableComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly accountStructureService = inject(AccountStructureService);
  private readonly ledgerService = inject(LedgerService);

  readonly accounts = input.required<LedgerAccount[]>();
  readonly saved = output<void>();
  readonly deleted = output<void>();

  displayedColumns = ['code', 'name', 'accountClass', 'actions'];

  addAccount() {
    this.accountStructureService.getAccountClasses().subscribe({
      next: (classes) => {
        const ref = this.dialog.open(LedgerAccountEditDialogComponent, {
          data: { accountClasses: classes } as LedgerAccountEditData,
          width: '420px',
        });
        ref.afterClosed().subscribe((r) => {
          if (r) this.saved.emit();
        });
      },
    });
  }

  editAccount(account: LedgerAccount) {
    this.accountStructureService.getAccountClasses().subscribe({
      next: (classes) => {
        const ref = this.dialog.open(LedgerAccountEditDialogComponent, {
          data: { item: account, accountClasses: classes } as LedgerAccountEditData,
          width: '420px',
        });
        ref.afterClosed().subscribe((r) => {
          if (r) this.saved.emit();
        });
      },
    });
  }

  deleteAccount(account: LedgerAccount) {
    if (!confirm(`Are you sure you want to delete "${account.name}"?`)) return;
    this.ledgerService.delete(account.id).subscribe({
      next: () => {
        this.snackBar.open('Ledger account deleted', undefined, { duration: 3000 });
        this.deleted.emit();
      },
      error: (err) => {
        const msg = err?.error?.error ?? err?.message ?? 'Delete failed';
        this.snackBar.open(msg, undefined, { duration: 5000 });
      },
    });
  }
}
