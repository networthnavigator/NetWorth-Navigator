import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AssetsLiabilitiesService } from '../services/assets-liabilities.service';
import { LedgerService } from '../services/ledger.service';
import { AccountStructureService } from '../services/account-structure.service';
import { LedgerAccount } from '../models/ledger-account.model';
import { AccountClassOption } from '../models/account-structure.model';
import { BalanceSheetAccount } from '../models/assets-liabilities.model';
import { LedgerAccountSelectComponent } from '../components/ledger-account-select/ledger-account-select.component';

export interface AddUnknownAccountsWizardData {
  /** OwnAccount values from the file that are not yet in My accounts. */
  unknownAccounts: string[];
}

interface AccountForm {
  accountNumber: string;
  name: string;
  ledgerAccountId: number | null;
  /** When true, show the "Create new ledger account" box for this row */
  showCreateNewLedger: boolean;
  newLedgerAccountStructureId: number | null;
  newLedgerCode: string;
  newLedgerName: string;
}

@Component({
  selector: 'app-add-unknown-accounts-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LedgerAccountSelectComponent,
  ],
  template: `
    <h2 mat-dialog-title>Add accounts from your upload</h2>
    <mat-dialog-content>
      <mat-stepper linear #stepper>
        <mat-step label="Intro">
          <p class="intro-text">
            The following account(s) from your upload are not yet in <strong>My accounts</strong>.
            Add them so you can link transactions to your balance sheet and see them in Assets &amp; Liabilities.
          </p>
          <ul class="account-list">
            @for (acc of data.unknownAccounts; track acc) {
              <li><span class="mono">{{ acc }}</span></li>
            }
          </ul>
          <div class="stepper-actions">
            <button mat-button matStepperNext>Next</button>
          </div>
        </mat-step>

        @for (item of accountForms(); track item.accountNumber; let i = $index) {
          <mat-step [label]="'Account ' + (i + 1)" [completed]="isAccountStepValid(i)">
            <div class="account-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Account number</mat-label>
                <input matInput [value]="item.accountNumber" readonly>
                <mat-hint>From your file (e.g. IBAN)</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="item.name" name="name{{i}}" placeholder="e.g. ING Current account" required>
              </mat-form-field>
              <app-ledger-account-select
                [accounts]="assetsLedgerAccounts()"
                [value]="item.ledgerAccountId"
                (valueChange)="item.ledgerAccountId = $event"
                label="Ledger account (Assets)*"
                placeholder="Type to filter..."
                hint="Link this balance sheet account to a ledger account for bookings."
                [required]="!item.showCreateNewLedger"
              />
              <button mat-stroked-button type="button" class="create-new-link" (click)="item.showCreateNewLedger = true" [style.display]="item.showCreateNewLedger ? 'none' : 'inline-flex'">
                ➕ Create new ledger account
              </button>
              @if (item.showCreateNewLedger) {
                <div class="create-ledger-box">
                  <p class="create-ledger-title">Create new ledger account</p>
                  <p class="hint">Choose where in the structure this account belongs, then enter account number and name.</p>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Account class (position in structure)</mat-label>
                    <mat-select [(ngModel)]="item.newLedgerAccountStructureId" name="ac{{i}}" required>
                      @for (ac of accountClasses(); track ac.id) {
                        <mat-option [value]="ac.id">{{ ac.path }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Account number</mat-label>
                    <input matInput [(ngModel)]="item.newLedgerCode" name="code{{i}}" placeholder="e.g. 1101" required>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Name</mat-label>
                    <input matInput [(ngModel)]="item.newLedgerName" name="newName{{i}}" placeholder="e.g. ING Current account" required>
                  </mat-form-field>
                  <button mat-stroked-button type="button" (click)="createLedgerForAccount(i)" [disabled]="!canCreateLedger(i)">
                    Create and use this ledger account
                  </button>
                </div>
              }
            </div>
            <div class="stepper-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-button matStepperNext [disabled]="!isAccountStepValid(i)">Next</button>
            </div>
          </mat-step>
        }

        <mat-step label="Done">
          <p class="intro-text">Click <strong>Add accounts</strong> to create the accounts in My accounts. You can then view them under Assets &amp; Liabilities.</p>
          <div class="stepper-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button color="primary" (click)="saveAll(); $event.preventDefault()" [disabled]="saving() || !allStepsValid()">
              {{ saving() ? 'Adding…' : 'Add accounts' }}
            </button>
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .intro-text { margin: 0 0 16px; line-height: 1.5; }
    .account-list { margin: 16px 0; padding-left: 24px; }
    .account-list .mono { font-family: ui-monospace, monospace; }
    .account-form { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
    .full-width { width: 100%; }
    .create-ledger-box {
      margin-top: 16px;
      padding: 16px;
      background: var(--mat-sys-surface-container-high, #f5f5f5);
      border-radius: 8px;
    }
    html.theme-dark .create-ledger-box { background: var(--mat-sys-surface-container-high); }
    .create-ledger-title { font-weight: 600; margin: 0 0 8px; }
    .hint { margin: 0 0 12px; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant, #555); }
    .stepper-actions { margin-top: 16px; display: flex; gap: 8px; }
    .create-new-link { margin-top: 4px; }
    mat-dialog-content { min-width: 420px; max-width: 560px; }
  `],
})
export class AddUnknownAccountsWizardComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<AddUnknownAccountsWizardComponent>);
  readonly data = inject<AddUnknownAccountsWizardData>(MAT_DIALOG_DATA);
  private readonly assetsService = inject(AssetsLiabilitiesService);
  private readonly ledgerService = inject(LedgerService);
  private readonly structureService = inject(AccountStructureService);
  private readonly snackBar = inject(MatSnackBar);

  readonly accountForms = signal<AccountForm[]>([]);
  readonly assetsLedgerAccounts = signal<LedgerAccount[]>([]);
  readonly accountClasses = signal<AccountClassOption[]>([]);
  readonly saving = signal(false);

  ngOnInit(): void {
    this.accountForms.set(
      this.data.unknownAccounts.map(oa => ({
        accountNumber: oa,
        name: this.suggestName(oa),
        ledgerAccountId: null as number | null,
        showCreateNewLedger: false,
        newLedgerAccountStructureId: null as number | null,
        newLedgerCode: '',
        newLedgerName: '',
      }))
    );
    forkJoin({
      ledger: this.ledgerService.getAssets(),
      classes: this.structureService.getAccountClasses(),
    }).subscribe({
      next: ({ ledger, classes }) => {
        this.assetsLedgerAccounts.set(ledger);
        this.accountClasses.set(classes);
        const forms = this.accountForms();
        if (forms.length > 0 && classes.length > 0 && forms.every(f => !f.newLedgerAccountStructureId)) {
          this.accountForms.update(list =>
            list.map(f => ({ ...f, newLedgerAccountStructureId: classes[0]?.id ?? null }))
          );
        }
      },
      error: () => this.snackBar.open('Could not load ledger accounts or structure', undefined, { duration: 3000 }),
    });
  }

  private suggestName(accountNumber: string): string {
    const s = accountNumber.trim();
    if (s.length <= 4) return s;
    return s.slice(0, 4) + '…' + s.slice(-4);
  }

  isAccountStepValid(index: number): boolean {
    const forms = this.accountForms();
    const item = forms[index];
    if (!item || !item.name.trim()) return false;
    if (item.ledgerAccountId == null || item.ledgerAccountId <= 0) return false;
    return true;
  }

  canCreateLedger(index: number): boolean {
    const item = this.accountForms()[index];
    return !!(item?.newLedgerAccountStructureId && item.newLedgerCode?.trim() && item.newLedgerName?.trim());
  }

  createLedgerForAccount(index: number): void {
    const forms = this.accountForms();
    const item = forms[index];
    if (!item || !item.newLedgerAccountStructureId || !item.newLedgerCode?.trim() || !item.newLedgerName?.trim()) return;
    this.ledgerService.create({
      accountStructureId: item.newLedgerAccountStructureId,
      code: item.newLedgerCode.trim(),
      name: item.newLedgerName.trim(),
    }).subscribe({
      next: (created) => {
        this.assetsLedgerAccounts.update(list => [...list, created]);
        this.accountForms.update(list => {
          const copy = [...list];
          copy[index] = { ...copy[index], ledgerAccountId: created.id, showCreateNewLedger: false, newLedgerCode: '', newLedgerName: '' };
          return copy;
        });
        this.snackBar.open('Ledger account created: ' + created.name, undefined, { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err?.error?.error ?? 'Could not create ledger account', undefined, { duration: 4000 }),
    });
  }

  allStepsValid(): boolean {
    const forms = this.accountForms();
    return forms.length > 0 && forms.every(f =>
      f.name.trim() && f.ledgerAccountId != null && f.ledgerAccountId > 0
    );
  }

  saveAll(): void {
    if (!this.allStepsValid() || this.saving()) return;
    const forms = this.accountForms();
    const toCreate: Partial<BalanceSheetAccount>[] = forms.map(f => ({
        accountNumber: f.accountNumber,
      name: f.name.trim(),
      currentBalance: 0,
      currency: 'EUR',
      ledgerAccountId: f.ledgerAccountId ?? null,
    }));
    this.saving.set(true);
    let done = 0;
    const total = toCreate.length;
    toCreate.forEach(acc => {
      this.assetsService.createAccount(acc).subscribe({
        next: () => {
          done++;
          if (done === total) {
            this.saving.set(false);
            this.snackBar.open(total + ' account(s) added to My accounts.', undefined, { duration: 4000 });
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.snackBar.open(err?.error?.error ?? 'Could not add account', undefined, { duration: 4000 });
        },
      });
    });
    if (total === 0) {
      this.saving.set(false);
      this.dialogRef.close(true);
    }
  }
}
