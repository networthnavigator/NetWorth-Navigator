import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LedgerAccount } from '../models/ledger-account.model';

@Injectable({
  providedIn: 'root',
})
export class LedgerService {
  private readonly base =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/ledger'
      : '/api/ledger';

  constructor(private http: HttpClient) {}

  getAll(): Observable<LedgerAccount[]> {
    return this.http.get<LedgerAccount[]>(this.base);
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
