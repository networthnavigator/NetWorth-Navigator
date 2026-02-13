import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountStructure } from '../models/account-structure.model';
import { AccountClassOption } from '../models/account-structure.model';

@Injectable({
  providedIn: 'root',
})
export class AccountStructureService {
  private readonly base =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/accountstructure'
      : '/api/accountstructure';

  constructor(private http: HttpClient) {}

  getUsedStructure(): Observable<AccountStructure[]> {
    return this.http.get<AccountStructure[]>(`${this.base}/used`);
  }

  getAccountClasses(): Observable<AccountClassOption[]> {
    return this.http.get<AccountClassOption[]>(`${this.base}/account-classes`);
  }
}
