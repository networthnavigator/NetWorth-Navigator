import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CURRENCIES } from '../models/preferences.model';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { Property } from '../models/assets-liabilities.model';

const INSTRUCTIONAL_TEXT = 'Add or edit a property (e.g. home, land). You can record purchase date and value; use valuations to track the estimated value over time.';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit property' : 'Add property' }}</h1>
        <a mat-stroked-button routerLink="/assets-liabilities">Back to Assets & Liabilities</a>
      </div>
      <p class="instructional">{{ INSTRUCTIONAL_TEXT }}</p>

      <mat-card class="form-card">
        <mat-card-content>
          <form class="form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="form.name" name="name" required>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Purchase date (optional)</mat-label>
              <input matInput [matDatepicker]="picker" [(ngModel)]="form.purchaseDate" name="purchaseDate">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker touchUi></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Purchase value (optional)</mat-label>
              <input matInput type="number" [(ngModel)]="form.purchaseValue" name="purchaseValue">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Currency</mat-label>
              <mat-select [(ngModel)]="form.currency" name="currency">
                @for (c of CURRENCIES; track c.code) {
                  <mat-option [value]="c.code">{{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </form>
        </mat-card-content>
        <mat-card-actions align="end">
          @if (isEdit && id != null) {
            <button mat-button color="warn" (click)="deleteProperty()" [disabled]="saving">Delete</button>
          }
          <span class="spacer"></span>
          <a mat-button routerLink="/assets-liabilities">Cancel</a>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="!form.name.trim() || saving">Save</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 560px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 500; }
    .instructional { margin: 0 0 24px; font-size: 0.95rem; color: var(--mat-sys-on-surface-variant, #555); line-height: 1.5; }
    .form-card { padding: 24px; }
    .form { display: flex; flex-direction: column; }
    .full-width { width: 100%; }
    mat-card-actions { padding: 16px 24px; }
    .spacer { flex: 1; }
  `],
})
export class PropertyFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(AssetsLiabilitiesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly CURRENCIES = CURRENCIES;
  readonly INSTRUCTIONAL_TEXT = INSTRUCTIONAL_TEXT;

  isEdit = false;
  id: number | null = null;
  saving = false;

  form = {
    name: '',
    purchaseValue: null as number | string | null,
    purchaseDate: null as Date | null,
    currency: 'EUR' as string,
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      const numId = parseInt(idParam, 10);
      if (!isNaN(numId)) {
        this.id = numId;
        this.isEdit = true;
        this.service.getProperties().subscribe((list) => {
          const item = list.find((p) => p.id === numId);
          if (item) {
            this.form = {
              name: item.name,
              purchaseValue: item.purchaseValue ?? null,
              purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
              currency: item.currency,
            };
          }
        });
      }
    }
  }

  private toDateOnlyString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00`;
  }

  save(): void {
    if (!this.form.name.trim() || this.saving) return;
    this.saving = true;
    const val = this.form.purchaseValue;
    const isEmpty = val === null || val === undefined || val === '';
    const numVal = isEmpty ? null : Number(val);
    const date = this.form.purchaseDate as Date | null;
    const payload = {
      name: this.form.name.trim(),
      purchaseValue: (numVal !== null && isNaN(numVal)) ? null : numVal,
      purchaseDate: date ? this.toDateOnlyString(date) : null,
      currency: this.form.currency,
    };
    if (this.isEdit && this.id != null) {
      this.service.updateProperty({ ...payload, id: this.id } as Property).subscribe({
        next: () => {
          this.snackBar.open('Property updated', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to update', undefined, { duration: 4000 });
        },
      });
    } else {
      this.service.createProperty(payload).subscribe({
        next: () => {
          this.snackBar.open('Property added', undefined, { duration: 2000 });
          this.router.navigate(['/assets-liabilities']);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err?.error?.error ?? 'Failed to add', undefined, { duration: 4000 });
        },
      });
    }
  }

  deleteProperty(): void {
    if (this.id == null || !confirm('Delete this property?')) return;
    this.saving = true;
    this.service.deleteProperty(this.id).subscribe({
      next: () => {
        this.snackBar.open('Property deleted', undefined, { duration: 2000 });
        this.router.navigate(['/assets-liabilities']);
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to delete', undefined, { duration: 4000 });
      },
    });
  }
}
