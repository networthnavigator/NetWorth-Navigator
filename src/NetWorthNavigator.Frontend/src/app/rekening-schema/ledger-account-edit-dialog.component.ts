import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LedgerAccount } from '../models/ledger-account.model';
import { AccountClassOption } from '../models/account-structure.model';
import { LedgerService } from '../services/ledger.service';

export interface LedgerAccountEditData {
  item?: LedgerAccount;
  accountClasses: AccountClassOption[];
  /** When creating, preselect this account class. */
  initialAccountStructureId?: number;
}

@Component({
  selector: 'app-ledger-account-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit account' : 'New account' }}</h2>
    <mat-dialog-content>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Account class</mat-label>
          <mat-select [(ngModel)]="form.accountStructureId" name="accountStructureId" required>
            @for (ac of data.accountClasses; track ac.id) {
              <mat-option [value]="ac.id">{{ ac.path }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Account number</mat-label>
          <input matInput [(ngModel)]="form.code" name="code" placeholder="e.g. 1101" required>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name" name="name" required>
        </mat-form-field>
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
    .form { display: flex; flex-direction: column; gap: 8px; min-width: 360px; }
    .full-width { width: 100%; }
  `],
})
export class LedgerAccountEditDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<LedgerAccountEditDialogComponent>);
  private readonly ledgerService = inject(LedgerService);
  readonly data = inject<LedgerAccountEditData>(MAT_DIALOG_DATA);

  form = this.data.item
    ? {
        accountStructureId: this.data.item.accountStructureId,
        code: this.data.item.code,
        name: this.data.item.name,
      }
    : {
        accountStructureId: this.data.initialAccountStructureId ?? this.data.accountClasses[0]?.id ?? 0,
        code: '',
        name: '',
      };

  canSave(): boolean {
    return !!(
      this.form.accountStructureId &&
      this.form.code?.trim() &&
      this.form.name?.trim()
    );
  }

  save() {
    if (!this.canSave()) return;
    const payload = {
      accountStructureId: this.form.accountStructureId,
      code: this.form.code.trim(),
      name: this.form.name.trim(),
    };
    if (this.data.item) {
      this.ledgerService.update(this.data.item.id, payload).subscribe({
        next: (r) => this.dialogRef.close(r),
        error: (e) => console.error('Update failed', e),
      });
    } else {
      this.ledgerService.create(payload).subscribe({
        next: (r) => this.dialogRef.close(r),
        error: (e) => console.error('Create failed', e),
      });
    }
  }
}
