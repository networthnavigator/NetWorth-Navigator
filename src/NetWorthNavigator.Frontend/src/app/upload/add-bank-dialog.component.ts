import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DUTCH_BANKS, COUNTRIES, BankCatalogItem, CountryCode } from '../models/banks.model';

export interface AddBankResult {
  bankId: string;
  bankName: string;
  country: CountryCode;
  logoUrl?: string;
}

@Component({
  selector: 'app-add-bank-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Add bank</h2>
    <mat-dialog-content>
      <p class="hint">Select a bank and country to add.</p>
      <form class="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Country</mat-label>
          <mat-select [(ngModel)]="form.country" name="country" required>
            @for (c of COUNTRIES; track c.code) {
              <mat-option [value]="c.code">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Bank</mat-label>
          <mat-select [(ngModel)]="form.bankId" name="bankId" required>
            @for (bank of DUTCH_BANKS; track bank.id) {
              <mat-option [value]="bank.id">
                <div class="bank-option">
                  @if (bank.logoUrl) {
                    <img [src]="bank.logoUrl" [alt]="bank.name" class="bank-option-icon" [class.logo-transparent-bg]="isIngLogo(bank.logoUrl)">
                  }
                  <span>{{ bank.name }}</span>
                </div>
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (selectedBank()) {
        <div class="bank-preview">
          <span class="preview-label">Selected:</span>
          <div class="preview-tile">
            @if (selectedBank()!.logoUrl) {
              <img [src]="selectedBank()!.logoUrl" [alt]="selectedBank()!.name" class="preview-logo" [class.logo-transparent-bg]="isIngLogo(selectedBank()!.logoUrl)">
            }
            <span class="preview-name">{{ selectedBank()!.name }} — {{ countryName() }}</span>
          </div>
        </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="add()" [disabled]="!form.bankId || !form.country">
        Add bank
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint { color: #666; margin: 0 0 16px; font-size: 0.9em; }
    html.theme-dark .hint { color: rgba(255,255,255,0.7); }
    .form { display: flex; flex-direction: column; gap: 8px; min-width: 320px; }
    .full-width { width: 100%; }
    .bank-option { display: flex; align-items: center; gap: 10px; }
    .bank-option-icon { height: 24px; width: auto; object-fit: contain; }
    .logo-transparent-bg { mix-blend-mode: lighten; }
    .bank-preview { margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.04); border-radius: 8px; }
    html.theme-dark .bank-preview { background: rgba(255,255,255,0.06); }
    .preview-label { font-size: 0.85em; color: #666; display: block; margin-bottom: 8px; }
    html.theme-dark .preview-label { color: rgba(255,255,255,0.6); }
    .preview-tile { display: flex; align-items: center; gap: 12px; }
    .preview-logo { height: 32px; width: auto; object-fit: contain; }
    .preview-name { font-weight: 500; }
  `],
})
export class AddBankDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddBankDialogComponent>);

  readonly DUTCH_BANKS = DUTCH_BANKS;
  readonly COUNTRIES = COUNTRIES;

  isIngLogo(logoUrl: string | undefined): boolean {
    return !!logoUrl?.toLowerCase().includes('ing');
  }

  form: { bankId: string; country: CountryCode } = {
    bankId: '',
    country: 'NL',
  };

  selectedBank(): BankCatalogItem | undefined {
    return this.form.bankId ? DUTCH_BANKS.find(b => b.id === this.form.bankId) : undefined;
  }

  countryName(): string {
    return COUNTRIES.find(c => c.code === this.form.country)?.name ?? this.form.country;
  }

  add() {
    const bank = this.selectedBank();
    if (!bank || !this.form.country) return;
    const result: AddBankResult = {
      bankId: bank.id,
      bankName: bank.name,
      country: this.form.country,
      logoUrl: bank.logoUrl,
    };
    this.dialogRef.close(result);
  }
}
