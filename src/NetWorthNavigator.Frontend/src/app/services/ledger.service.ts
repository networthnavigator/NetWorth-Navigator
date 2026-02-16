import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LedgerAccount } from '../models/ledger-account.model';

@Injectable({
  providedIn: 'root',
})
export class LedgerService {
  /** Use relative URL so the dev server proxies /api/* to the backend (avoids CORS). */
  private readonly base = '/api/ledger';

  constructor(private http: HttpClient) {}

  getAll(): Observable<LedgerAccount[]> {
    return this.http.get<LedgerAccount[]>(this.base);
  }

  /** Ledger accounts in the Assets category only (for linking balance-sheet accounts from transactions). */
  getAssets(): Observable<LedgerAccount[]> {
    return this.http.get<LedgerAccount[]>(`${this.base}/assets`);
  }

  create(dto: { accountStructureId: number; code: string; name: string }): Observable<LedgerAccount> {
    return this.http.post<LedgerAccount>(this.base, dto);
  }

  update(id: number, dto: { accountStructureId?: number; code?: string; name?: string; sortOrder?: number }): Observable<LedgerAccount> {
    return this.http.put<LedgerAccount>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

const CHART_OF_ACCOUNTS_SEED_BASE = '/api/chart-of-accounts/seed';

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsSeedService {
  constructor(private http: HttpClient) {}

  seed(): Observable<{ ledgerAccountsAdded: number }> {
    return this.http.post<{ ledgerAccountsAdded: number }>(CHART_OF_ACCOUNTS_SEED_BASE, {});
  }

  updateSeedFile(): Observable<{ message: string; path: string }> {
    return this.http.post<{ message: string; path: string }>(`${CHART_OF_ACCOUNTS_SEED_BASE}/update-file`, {});
  }
}
