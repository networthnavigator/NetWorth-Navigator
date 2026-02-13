import { Component, signal, inject } from '@angular/core';
import { UserPreferencesService } from './services/user-preferences.service';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
    SidebarComponent,
  ],
  template: `
    @if (auth.isLoggedIn()) {
      <div class="app-container">
        <header class="header mat-toolbar mat-primary">
          <button mat-icon-button (click)="toggleSidebar()"
                  [matTooltip]="sidebarCollapsed() ? 'Expand menu' : 'Collapse menu'"
                  aria-label="Menu">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <span class="app-name">NetWorth Navigator</span>
        </header>
        <div class="body">
          <app-sidebar [collapsed]="sidebarCollapsed()" />
          <main class="content">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
    }
    .header .material-symbols-outlined {
      font-size: 28px;
    }
    .app-name {
      font-size: 1.25rem;
      font-weight: 500;
    }
    .body {
      flex: 1;
      display: flex;
      min-height: 0;
      overflow: hidden;
    }
    .content {
      flex: 1;
      min-width: 0;
      min-height: 0;
      padding: 24px;
      overflow-y: auto;
      overflow-x: hidden;
    }
  `],
})
export class AppComponent {
  private readonly _prefs = inject(UserPreferencesService); // ensures theme applied on load
  readonly auth = inject(AuthService);
  readonly sidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }
}
