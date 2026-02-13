import { Injectable, signal } from '@angular/core';
import { CurrencyCode, ThemeId } from '../models/preferences.model';

const STORAGE_PREFIX = 'networth-navigator-';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  private readonly _defaultCurrency = signal<CurrencyCode>(this.load('defaultCurrency', 'EUR') as CurrencyCode);
  private readonly _theme = signal<ThemeId>(this.loadTheme());
  private readonly _darkMode = signal<boolean>(this.load('darkMode', 'true') === 'true');
  private loadTheme(): ThemeId {
    const stored = this.load('theme', 'purple-green');
    const valid: ThemeId[] = ['purple-green', 'indigo-pink', 'cyan-orange', 'azure-blue', 'green-teal'];
    return valid.includes(stored as ThemeId) ? (stored as ThemeId) : 'purple-green';
  }

  constructor() {
    this.applyTheme(this._theme());
  }

  readonly defaultCurrency = this._defaultCurrency.asReadonly();
  readonly theme = this._theme.asReadonly();
  readonly darkMode = this._darkMode.asReadonly();

  setDefaultCurrency(code: CurrencyCode): void {
    this._defaultCurrency.set(code);
    this.save('defaultCurrency', code);
  }

  setTheme(id: ThemeId): void {
    this._theme.set(id);
    this.save('theme', id);
    this.applyTheme(id);
  }

  setDarkMode(on: boolean): void {
    this._darkMode.set(on);
    this.save('darkMode', String(on));
    this.applyTheme(this._theme());
  }

  private static readonly DARK_THEMES: ThemeId[] = [
    'purple-green', 'indigo-pink', 'cyan-orange', 'azure-blue', 'green-teal',
  ];

  applyTheme(id: ThemeId): void {
    let link = document.getElementById('material-theme') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = 'material-theme';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `assets/themes/${id}.css`;
    const useDark = this._darkMode() && UserPreferencesService.DARK_THEMES.includes(id);
    document.documentElement.classList.toggle('theme-dark', useDark);
  }

  toggleDarkMode(): void {
    this.setDarkMode(!this._darkMode());
  }

  private load<T extends string>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      return (stored as T) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private save(key: string, value: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch {
      /* ignore */
    }
  }
}
