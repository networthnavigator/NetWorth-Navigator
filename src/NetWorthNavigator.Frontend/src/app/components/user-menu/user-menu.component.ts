import { Component, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { THEMES, CURRENCIES } from '../../models/preferences.model';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Settings">
      <mat-icon>settings</mat-icon>
    </button>
    <mat-menu #menu="matMenu" xPosition="before">
      <div class="menu-content">
        <span class="menu-title">Settings</span>

        <mat-form-field appearance="outline" class="menu-field">
          <mat-label>Default currency</mat-label>
          <mat-select [value]="prefs.defaultCurrency()" (selectionChange)="prefs.setDefaultCurrency($event.value)">
            @for (c of CURRENCIES; track c.code) {
              <mat-option [value]="c.code">{{ c.name }} ({{ c.symbol }})</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="menu-field">
          <mat-label>Theme</mat-label>
          <mat-select [value]="prefs.theme()" (selectionChange)="prefs.setTheme($event.value)">
            @for (t of THEMES; track t.id) {
              <mat-option [value]="t.id">{{ t.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </mat-menu>
  `,
  styles: [`
    .menu-content { padding: 16px; min-width: 220px; }
    .menu-title { font-weight: 600; display: block; margin-bottom: 12px; }
    .menu-field { width: 100%; display: block; margin-bottom: 8px; }
    .menu-field .mat-mdc-form-field-subscript-wrapper { display: none; }
  `],
})
export class UserMenuComponent {
  protected readonly prefs = inject(UserPreferencesService);
  protected readonly THEMES = THEMES;
  protected readonly CURRENCIES = CURRENCIES;
}
