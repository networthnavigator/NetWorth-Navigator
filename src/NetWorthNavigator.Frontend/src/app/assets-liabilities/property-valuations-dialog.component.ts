import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Property, PropertyValuation } from '../models/assets-liabilities.model';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { getCurrencySymbol } from '../models/preferences.model';

export interface PropertyValuationsDialogData {
  property: Property;
}

@Component({
  selector: 'app-property-valuations-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Valuations for {{ data.property.name }}</h2>
    <mat-dialog-content>
      <div class="valuations-section">
        <div class="section-header">
          <h3>Valuation history</h3>
          <button mat-stroked-button (click)="addValuation()">
            <span class="material-symbols-outlined">add</span>
            Add valuation
          </button>
        </div>
        <table mat-table [dataSource]="valuations()" class="full-width">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let row">{{ row.valuationDate | date:'dd-MM-yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="value">
            <th mat-header-cell *matHeaderCellDef>Value</th>
            <td mat-cell *matCellDef="let row">{{ formatMoney(row.value, data.property.currency) }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="editValuation(row)" matTooltip="Edit"><span class="material-symbols-outlined">edit</span></button>
              <button mat-icon-button (click)="deleteValuation(row)" matTooltip="Delete"><span class="material-symbols-outlined">delete</span></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
          <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="3">No valuations yet. Add one to get started.</td></tr>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .valuations-section { min-width: 500px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h3 { margin: 0; font-size: 1.1em; }
    .section-header button .material-symbols-outlined { font-size: 20px; vertical-align: middle; margin-right: 4px; }
    .full-width { width: 100%; }
  `],
})
export class PropertyValuationsDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<PropertyValuationsDialogComponent>);
  private readonly service = inject(AssetsLiabilitiesService);
  readonly data = inject<PropertyValuationsDialogData>(MAT_DIALOG_DATA);

  readonly valuations = signal<PropertyValuation[]>([]);
  readonly columns = ['date', 'value', 'actions'];

  ngOnInit(): void {
    this.loadValuations();
  }

  loadValuations(): void {
    this.service.getPropertyValuations(this.data.property.id).subscribe({
      next: (vals) => this.valuations.set(vals),
    });
  }

  formatMoney(value: number, currency: string): string {
    const sym = getCurrencySymbol(currency);
    return sym + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  addValuation(): void {
    const date = new Date().toISOString().slice(0, 10);
    const value = this.valuations().length > 0 ? this.valuations()[this.valuations().length - 1].value : 0;
    const valuation: Partial<PropertyValuation> = {
      valuationDate: date + 'T00:00:00',
      value: value,
    };
    this.service.createPropertyValuation(this.data.property.id, valuation).subscribe({
      next: () => this.loadValuations(),
    });
  }

  editValuation(val: PropertyValuation): void {
    const newDate = prompt('Date (YYYY-MM-DD):', val.valuationDate.slice(0, 10));
    if (!newDate) return;
    const newValue = prompt('Value:', val.value.toString());
    if (newValue === null) return;
    const updated: PropertyValuation = {
      ...val,
      valuationDate: newDate + 'T00:00:00',
      value: Number(newValue),
    };
    this.service.updatePropertyValuation(this.data.property.id, updated).subscribe({
      next: () => this.loadValuations(),
    });
  }

  deleteValuation(val: PropertyValuation): void {
    if (!confirm(`Delete valuation from ${val.valuationDate.slice(0, 10)}?`)) return;
    this.service.deletePropertyValuation(this.data.property.id, val.id).subscribe({
      next: () => this.loadValuations(),
    });
  }
}
