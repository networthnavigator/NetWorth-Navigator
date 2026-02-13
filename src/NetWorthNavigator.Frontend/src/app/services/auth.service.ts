import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'networth-navigator-auth';
const TEST_USER_ID = 'testuser';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _user = signal<string | null>(this.loadStored());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  private loadStored(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const v = sessionStorage.getItem(STORAGE_KEY);
      return v === TEST_USER_ID ? v : null;
    } catch {
      return null;
    }
  }

  loginAsTestUser(): void {
    this._user.set(TEST_USER_ID);
    try {
      sessionStorage.setItem(STORAGE_KEY, TEST_USER_ID);
    } catch {}
  }

  logout(): void {
    this._user.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
