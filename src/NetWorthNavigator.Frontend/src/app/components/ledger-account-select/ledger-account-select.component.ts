import { Component, input, output, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { LedgerAccount } from '../../models/ledger-account.model';

/**
 * Reusable ledger account selector: autocomplete, sorted by ledger code.
 * Use in Automated Booking Rules (line items) and Add/Edit account (assets only).
 */
@Component({
  selector: 'app-ledger-account-select',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      @if (label()) {
        <mat-label>{{ label() }}</mat-label>
      }
      <input matInput
        type="text"
        [ngModel]="searchText()"
        (ngModelChange)="onSearchChange($event)"
        [matAutocomplete]="auto"
        [placeholder]="placeholder()"
        [attr.required]="required() ? true : null">
      <mat-autocomplete #auto="matAutocomplete"
        (optionSelected)="onOptionSelected($event)">
        @for (la of filteredOptions(); track la.id) {
          <mat-option [value]="la">
            <span class="option-main">{{ la.code }} {{ la.name }}</span>
            @if (la.accountStructurePath) {
              <span class="option-context">{{ la.accountStructurePath }}</span>
            }
          </mat-option>
        }
      </mat-autocomplete>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-option { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
    .option-main { font-weight: 500; }
    .option-context { font-size: 0.8em; color: var(--mat-sys-on-surface-variant, #666); }
  `],
})
export class LedgerAccountSelectComponent {
  /** Ledger accounts to choose from (e.g. from LedgerService.getAssets() or getAll()). */
  accounts = input.required<LedgerAccount[]>();
  /** Currently selected ledger account id (two-way). */
  value = input<number | null>(null);
  valueChange = output<number | null>();
  label = input<string>('Ledger account');
  placeholder = input<string>('Type to filter...');
  hint = input<string | undefined>(undefined);
  required = input<boolean>(false);

  searchText = signal('');

  /** Sorted by ledger code (number). */
  sortedAccounts = computed(() => {
    const list = this.accounts() ?? [];
    return [...list].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
  });

  filteredOptions = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const sorted = this.sortedAccounts();
    if (!q) return sorted;
    const searchable = (la: LedgerAccount) =>
      `${la.code ?? ''} ${la.name ?? ''} ${la.accountStructurePath ?? ''}`.toLowerCase().includes(q);
    return sorted.filter(searchable);
  });

  /** Display text for a ledger account (code + name, optionally with path for context). */
  private static displayText(la: LedgerAccount): string {
    const main = `${la.code} ${la.name}`.trim();
    if (la.accountStructurePath?.trim()) return `${main} (${la.accountStructurePath})`;
    return main;
  }

  constructor() {
    effect(() => {
      const v = this.value();
      const list = this.sortedAccounts();
      if (v != null && list.length > 0) {
        const la = list.find(a => a.id === v);
        this.searchText.set(la ? LedgerAccountSelectComponent.displayText(la) : '');
      } else {
        this.searchText.set('');
      }
    });
  }

  onSearchChange(text: string): void {
    this.searchText.set(text ?? '');
    const id = this.resolveIdFromSearch(text);
    this.valueChange.emit(id);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const la = event.option.value as LedgerAccount;
    this.searchText.set(la ? LedgerAccountSelectComponent.displayText(la) : '');
    this.valueChange.emit(la?.id ?? null);
  }

  private resolveIdFromSearch(text: string): number | null {
    const t = (text ?? '').trim();
    if (!t) return null;
    const currentId = this.value();
    const list = this.sortedAccounts();
    const match = list.find(la =>
      LedgerAccountSelectComponent.displayText(la) === t || la.id === currentId
    );
    return match?.id ?? null;
  }
}
