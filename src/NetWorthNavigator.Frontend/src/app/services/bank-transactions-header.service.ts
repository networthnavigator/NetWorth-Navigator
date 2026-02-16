import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BankTransactionsHeader } from '../models/bank-transactions-header.model';

@Injectable({
  providedIn: 'root',
})
export class BankTransactionsHeaderService {
  private readonly apiUrl =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/banktransactionsheaders'
      : '/api/banktransactionsheaders';

  constructor(private http: HttpClient) {}

  getAll(): Observable<BankTransactionsHeader[]> {
    return this.http.get<BankTransactionsHeader[]>(this.apiUrl);
  }

  /** Delete all transactions (empties the table). */
  deleteAll(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(this.apiUrl);
  }

  /** Distinct OwnAccount values from imported transactions (for adding as balance sheet accounts). */
  getOwnAccounts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/own-accounts`);
  }
}
