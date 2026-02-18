import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingRule } from '../models/booking-rule.model';

const BASE =
  typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:5000/api/businessrules'
    : '/api/businessrules';

@Injectable({ providedIn: 'root' })
export class BookingRulesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<BookingRule[]> {
    return this.http.get<BookingRule[]>(BASE);
  }

  create(rule: Partial<BookingRule>): Observable<BookingRule & { id: number }> {
    return this.http.post<BookingRule & { id: number }>(BASE, {
      name: rule.name,
      matchField: rule.matchField ?? 'ContraAccountName',
      matchOperator: rule.matchOperator ?? 'Contains',
      matchValue: rule.matchValue ?? '',
      ledgerAccountId: rule.ledgerAccountId!,
      secondLedgerAccountId: rule.secondLedgerAccountId ?? undefined,
      sortOrder: rule.sortOrder ?? 0,
      requiresReview: rule.requiresReview !== false,
    });
  }

  update(id: number, rule: Partial<BookingRule>): Observable<BookingRule> {
    return this.http.put<BookingRule>(`${BASE}/${id}`, {
      name: rule.name,
      matchField: rule.matchField,
      matchOperator: rule.matchOperator,
      matchValue: rule.matchValue,
      ledgerAccountId: rule.ledgerAccountId,
      secondLedgerAccountId: rule.secondLedgerAccountId ?? null,
      sortOrder: rule.sortOrder,
      isActive: rule.isActive,
      requiresReview: rule.requiresReview,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /** Import rules from repository seed file (Data/Seeds/booking-rules-seed.json). */
  seed(): Observable<{ rulesAdded: number }> {
    return this.http.post<{ rulesAdded: number }>(`${BASE}/seed`, {});
  }

  /** Update seed file with current rules. */
  updateSeedFile(): Observable<{ message: string; path: string }> {
    return this.http.post<{ message: string; path: string }>(`${BASE}/seed/update-file`, {});
  }
}
