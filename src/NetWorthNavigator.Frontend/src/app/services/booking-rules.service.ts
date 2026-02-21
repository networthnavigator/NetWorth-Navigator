import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingRule, BookingRuleCriterion } from '../models/booking-rule.model';

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
    const body: Record<string, unknown> = {
      name: rule.name,
      ledgerAccountId: rule.ledgerAccountId!,
      secondLedgerAccountId: rule.secondLedgerAccountId ?? undefined,
      lineItems: rule.lineItems ?? undefined,
      requiresReview: rule.requiresReview !== false,
    };
    const criteria = rule['criteria'];
    if (criteria != null && criteria.length > 0) {
      body['criteria'] = criteria.map((c: BookingRuleCriterion) => ({
        matchField: c.matchField ?? 'ContraAccountName',
        matchOperator: c.matchOperator ?? 'Contains',
        matchValue: c.matchValue ?? '',
      }));
    } else {
      body['matchField'] = rule['matchField'] ?? 'ContraAccountName';
      body['matchOperator'] = rule['matchOperator'] ?? 'Contains';
      body['matchValue'] = rule['matchValue'] ?? '';
    }
    return this.http.post<BookingRule & { id: number }>(BASE, body);
  }

  update(id: number, rule: Partial<BookingRule>): Observable<BookingRule> {
    const body: Record<string, unknown> = {
      name: rule.name,
      ledgerAccountId: rule.ledgerAccountId,
      secondLedgerAccountId: rule.secondLedgerAccountId ?? null,
      lineItems: rule.lineItems ?? undefined,
      isActive: rule.isActive,
      requiresReview: rule.requiresReview,
    };
    const criteriaUpd = rule['criteria'];
    if (criteriaUpd != null) {
      body['criteria'] = criteriaUpd.map((c: BookingRuleCriterion) => ({
        matchField: c.matchField ?? 'ContraAccountName',
        matchOperator: c.matchOperator ?? 'Contains',
        matchValue: c.matchValue ?? '',
      }));
    } else {
      body['matchField'] = rule['matchField'] ?? undefined;
      body['matchOperator'] = rule['matchOperator'] ?? undefined;
      body['matchValue'] = rule['matchValue'] ?? undefined;
    }
    return this.http.put<BookingRule>(`${BASE}/${id}`, body);
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

  /** Bookings whose source transaction line matches this rule (header data only). */
  getMatchingBookings(ruleId: number): Observable<RuleMatchingBookingSummary[]> {
    return this.http.get<RuleMatchingBookingSummary[]>(`${BASE}/${ruleId}/matching-bookings`);
  }
}

export interface RuleMatchingBookingSummary {
  id: string;
  date: string;
  reference: string;
  requiresReview: boolean;
  reviewedAt?: string | null;
  contraAccountName?: string | null;
  description?: string | null;
  amount: number;
  currency: string;
}
