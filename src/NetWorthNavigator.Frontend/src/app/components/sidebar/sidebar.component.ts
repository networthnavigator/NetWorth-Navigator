import { Component, input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { AuthService } from '../../services/auth.service';
import { THEMES, CURRENCIES } from '../../models/preferences.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <aside class="sidebar mat-toolbar mat-primary" [class.collapsed]="collapsed()">
      <nav class="nav">
        <a routerLink="/home" routerLinkActive="active"
           [matTooltip]="collapsed() ? 'Home' : null" class="nav-item">
          <span class="material-symbols-outlined nav-icon">home</span>
          @if (!collapsed()) {
            <span class="nav-label">Home</span>
          }
        </a>
        <a routerLink="/assets-liabilities" routerLinkActive="active"
           [matTooltip]="collapsed() ? 'Assets & Liabilities' : null" class="nav-item">
          <span class="material-symbols-outlined nav-icon">table_chart</span>
          @if (!collapsed()) {
            <span class="nav-label">Assets & Liabilities</span>
          }
        </a>
        <a routerLink="/upload" routerLinkActive="active"
           [matTooltip]="collapsed() ? 'Upload' : null" class="nav-item">
          <span class="material-symbols-outlined nav-icon">upload_file</span>
          @if (!collapsed()) {
            <span class="nav-label">Upload</span>
          }
        </a>
        <a routerLink="/bookings" routerLinkActive="active"
           [matTooltip]="collapsed() ? 'Bookings' : null" class="nav-item">
          <span class="material-symbols-outlined nav-icon">receipt_long</span>
          @if (!collapsed()) {
            <span class="nav-label">Bookings</span>
          }
        </a>
        <a routerLink="/booking-rules" routerLinkActive="active"
           [matTooltip]="collapsed() ? 'Automated booking rules' : null" class="nav-item">
          <span class="material-symbols-outlined nav-icon">rule</span>
          @if (!collapsed()) {
            <span class="nav-label">Automated booking rules</span>
          }
        </a>
        <a routerLink="/chart-of-accounts" routerLinkActive="active"
           [matTooltip]="collapsed() ? 'Chart of accounts' : null" class="nav-item">
          <span class="material-symbols-outlined nav-icon">account_balance</span>
          @if (!collapsed()) {
            <span class="nav-label">Chart of accounts</span>
          }
        </a>
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="nav-item user-menu-btn"
                [matMenuTriggerFor]="userMenu"
                [matTooltip]="collapsed() ? 'Preferences' : null"
                aria-label="Preferences">
          <span class="material-symbols-outlined nav-icon">person</span>
          @if (!collapsed()) {
            <span class="nav-label">Preferences</span>
          }
        </button>
        <mat-menu #userMenu="matMenu" yPosition="above" class="user-menu-panel">
          <div class="user-menu-content">
            <mat-form-field appearance="outline" class="menu-field">
              <mat-label>Theme</mat-label>
              <mat-select [value]="prefs.theme()" (selectionChange)="prefs.setTheme($event.value)">
                @for (t of THEMES; track t.id) {
                  <mat-option [value]="t.id">{{ t.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="menu-field">
              <mat-label>Currency</mat-label>
              <mat-select [value]="prefs.defaultCurrency()" (selectionChange)="prefs.setDefaultCurrency($event.value)">
                @for (c of CURRENCIES; track c.code) {
                  <mat-option [value]="c.code">{{ c.name }} ({{ c.symbol }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="dark-mode-row" matTooltip="Dark mode (coming later)">
              <span>Dark mode</span>
              <mat-slide-toggle [checked]="false" disabled></mat-slide-toggle>
            </div>
            <button mat-stroked-button type="button" class="logout-btn" (click)="logout()">
              Log out
            </button>
          </div>
        </mat-menu>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 220px;
      min-height: 100%;
      justify-content: space-between;
      background: var(--mat-toolbar-container-background-color, #1976d2);
      color: var(--mat-toolbar-container-text-color, #fff);
      transition: width 0.2s ease;
      overflow-x: hidden;
    }
    .sidebar.collapsed {
      width: 56px;
    }
    .nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 8px 16px;
    }
    a.nav-item {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 12px;
      color: inherit;
      text-decoration: none;
      opacity: 0.9;
      text-align: left;
      justify-content: flex-start;
      padding: 12px 16px;
      border-radius: 4px;
      min-height: 48px;
    }
    a.nav-item:hover {
      background: rgba(128, 128, 128, 0.2);
      opacity: 1;
    }
    a.nav-item.active {
      background: rgba(128, 128, 128, 0.25);
      opacity: 1;
    }
    .nav-item .nav-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      font-size: 28px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .nav-item .nav-label {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      line-height: 1.5;
    }
    .sidebar.collapsed a.nav-item {
      justify-content: center;
      padding: 12px;
    }
    .sidebar-footer {
      flex-shrink: 0;
      padding: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }
    .user-menu-btn {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.9;
      text-align: left;
      font: inherit;
    }
    .user-menu-btn:hover {
      background: rgba(128, 128, 128, 0.2);
      opacity: 1;
    }
    .sidebar.collapsed .user-menu-btn {
      justify-content: center;
      padding: 12px;
    }
    .user-menu-content { padding: 16px; min-width: 220px; }
    .menu-field { width: 100%; display: block; margin-bottom: 8px; }
    .menu-field .mat-mdc-form-field-subscript-wrapper { display: none; }
    .dark-mode-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.12); opacity: 0.6; }
    .logout-btn { margin-top: 16px; width: 100%; }
    :host ::ng-deep .user-menu-panel { margin-bottom: 8px; }
  `],
})
export class SidebarComponent {
  readonly collapsed = input<boolean>(false);
  protected readonly prefs = inject(UserPreferencesService);
  protected readonly THEMES = THEMES;
  protected readonly CURRENCIES = CURRENCIES;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
