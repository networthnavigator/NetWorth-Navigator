import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransactionLine } from '../models/transaction-line.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionLinesService {
  private readonly apiUrl =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/transaction-lines'
      : '/api/transaction-lines';

  constructor(private http: HttpClient) {}

  getAll(): Observable<TransactionLine[]> {
    return this.http.get<TransactionLine[]>(this.apiUrl);
  }

  /** Delete all imported documents and their lines. */
  deleteAll(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(this.apiUrl);
  }

  /** Distinct OwnAccount values from imported lines (for adding as balance sheet accounts). */
  getOwnAccounts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/own-accounts`);
  }

  /** Suggested opening balance for an own-account (balance before earliest transaction). Used to pre-fill Opening balance offset. */
  getSuggestedOpeningBalance(ownAccount: string): Observable<number | null> {
    return this.http.get<number | null>(`${this.apiUrl}/suggested-opening-balance`, {
      params: { ownAccount: ownAccount.trim() },
    });
  }
}
