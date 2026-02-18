import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="landing">
      <header class="landing-header">
        <a href="#" class="logo" (click)="scrollTop($event)">NetWorth Navigator</a>
        <nav class="header-nav">
          <a href="#features" (click)="scrollTo($event, 'features')">Features</a>
          <a href="#about" (click)="scrollTo($event, 'about')">About</a>
        </nav>
        <div class="header-actions">
          <button mat-button (click)="goToApp()">Log in</button>
          <button mat-raised-button color="primary" (click)="goToApp()">Sign up</button>
        </div>
      </header>

      <main class="landing-main">
        <section class="hero">
          <h1 class="hero-title">NetWorth Navigator</h1>
          <p class="hero-subtitle">net worth &amp; financial growth</p>
          <button mat-raised-button color="primary" class="hero-cta" (click)="goToApp()">
            Open app
          </button>
        </section>

        <section id="about" class="section what-is">
          <h2>What is NetWorth Navigator?</h2>
          <p>
            NetWorth Navigator is a personal finance app that helps you track your assets, liabilities and net worth.
            Import transaction data from CSV (bank, credit card, brokerage, crypto) or add movements manually later. Manage your chart of accounts and ledger, and see how your wealth develops over time.
          </p>
          <p>
            Want a clear view of your finances or a single place to follow your progress? NetWorth Navigator gives you the overview without the complexity.
          </p>
        </section>

        <section id="features" class="section features">
          <h2>Features</h2>

          <div class="feature-block">
            <h3>Net worth at a glance</h3>
            <p>
              Your dashboard shows your total net worth in your preferred currency. Assets, liabilities and equity in one number so you always know where you stand.
            </p>
          </div>

          <div class="feature-block">
            <h3>Bookings &amp; upload</h3>
            <p>
              Upload CSV exports from your bank, credit card, brokerage or crypto accounts. Map columns per file type and keep all transaction lines in one place. Manual entry (e.g. cash) is planned.
            </p>
          </div>

          <div class="feature-block">
            <h3>Chart of accounts</h3>
            <p>
              A standard structure based on common accounting practice (IFRS/UK GAAP). Add your own ledger accounts and organise them under categories that make sense.
            </p>
          </div>

          <div class="feature-block">
            <h3>Bookings &amp; rules</h3>
            <p>
              Turn transaction lines into double-entry bookings. Use business rules to suggest the right ledger account (e.g. when the counterparty is a known shop) and keep a clear record of income, expenses and movements.
            </p>
          </div>

          <div class="feature-block">
            <h3>Your preferences</h3>
            <p>
              Choose your currency and theme. Dates are shown in dd-mm-yyyy format.
            </p>
          </div>
        </section>
      </main>

      <footer class="landing-footer">
        <p>
          <a href="#">Privacy</a>
          <span class="sep">•</span>
          <a href="#">Terms</a>
          <span class="sep">•</span>
          <span class="copy">&copy; NetWorth Navigator</span>
        </p>
        <p class="foot-note">Early preview — not yet publicly launched.</p>
      </footer>
    </div>
  `,
  styles: [`
    .landing {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--mat-sys-surface, #fafafa);
      color: var(--mat-sys-on-surface, #1a1a1a);
    }
    html.theme-dark .landing {
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }

    .landing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
      gap: 24px;
    }
    html.theme-dark .landing-header {
      border-color: rgba(255, 255, 255, 0.08);
    }
    .logo {
      font-size: 1.25rem;
      font-weight: 600;
      color: inherit;
      text-decoration: none;
    }
    .logo:hover { opacity: 0.9; }
    .header-nav {
      display: flex;
      gap: 24px;
    }
    .header-nav a {
      color: var(--mat-sys-on-surface-variant, #555);
      text-decoration: none;
      font-size: 0.95rem;
    }
    .header-nav a:hover { text-decoration: underline; }
    html.theme-dark .header-nav a { color: var(--mat-sys-on-surface-variant); }
    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .landing-main {
      flex: 1;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 24px 64px;
      width: 100%;
    }

    .hero {
      text-align: center;
      padding: 56px 0 64px;
    }
    .hero-title {
      font-size: 2.75rem;
      font-weight: 600;
      margin: 0 0 8px;
      letter-spacing: -0.02em;
    }
    .hero-subtitle {
      font-size: 1.15rem;
      color: var(--mat-sys-on-surface-variant, #555);
      margin: 0 0 32px;
      text-transform: lowercase;
      letter-spacing: 0.02em;
    }
    html.theme-dark .hero-subtitle { color: var(--mat-sys-on-surface-variant); }
    .hero-cta {
      font-size: 1rem;
      padding: 0 28px;
      height: 44px;
    }

    .section {
      padding: 40px 0 32px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
    html.theme-dark .section { border-color: rgba(255, 255, 255, 0.06); }
    .section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 20px;
    }
    .what-is p,
    .section p {
      font-size: 1rem;
      line-height: 1.65;
      color: var(--mat-sys-on-surface-variant, #555);
      margin: 0 0 14px;
    }
    html.theme-dark .what-is p,
    html.theme-dark .section p { color: var(--mat-sys-on-surface-variant); }

    .features { padding-top: 48px; }
    .features > h2 { margin-bottom: 28px; }
    .feature-block {
      margin-bottom: 28px;
    }
    .feature-block:last-child { margin-bottom: 0; }
    .feature-block h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 8px;
    }
    .feature-block p {
      margin: 0;
      max-width: 56ch;
    }

    .landing-footer {
      padding: 28px 24px;
      text-align: center;
      font-size: 0.9rem;
      color: var(--mat-sys-outline, #666);
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
    html.theme-dark .landing-footer {
      color: var(--mat-sys-outline);
      border-color: rgba(255, 255, 255, 0.06);
    }
    .landing-footer a {
      color: inherit;
      text-decoration: none;
    }
    .landing-footer a:hover { text-decoration: underline; }
    .sep { margin: 0 8px; opacity: 0.7; }
    .foot-note { margin-top: 8px; font-size: 0.85rem; opacity: 0.85; }
  `],
})
export class WelcomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  goToApp(): void {
    this.auth.loginAsTestUser();
    this.router.navigate(['/home']);
  }

  scrollTop($event: Event): void {
    $event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollTo($event: Event, id: string): void {
    $event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
