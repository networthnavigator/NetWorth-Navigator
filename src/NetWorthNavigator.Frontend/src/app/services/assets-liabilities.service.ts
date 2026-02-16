import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BalanceSheetAccount, InvestmentAccount, Property, PropertyValuation, Mortgage } from '../models/assets-liabilities.model';

const BASE =
  typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:5000/api/assets-liabilities'
    : '/api/assets-liabilities';

@Injectable({ providedIn: 'root' })
export class AssetsLiabilitiesService {
  constructor(private http: HttpClient) {}

  getAccounts(): Observable<BalanceSheetAccount[]> {
    return this.http.get<BalanceSheetAccount[]>(`${BASE}/accounts`);
  }
  createAccount(item: Partial<BalanceSheetAccount>): Observable<BalanceSheetAccount> {
    const body = {
      name: item.name,
      currentBalance: item.currentBalance ?? 0,
      currency: item.currency ?? 'EUR',
      ledgerAccountId: item.ledgerAccountId ?? null,
    };
    return this.http.post<BalanceSheetAccount>(`${BASE}/accounts`, body);
  }
  updateAccount(item: BalanceSheetAccount): Observable<BalanceSheetAccount> {
    const body = {
      name: item.name,
      currentBalance: item.currentBalance,
      currency: item.currency,
      ledgerAccountId: item.ledgerAccountId ?? null,
    };
    return this.http.put<BalanceSheetAccount>(`${BASE}/accounts/${item.id}`, body);
  }
  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/accounts/${id}`);
  }

  getInvestmentAccounts(): Observable<InvestmentAccount[]> {
    return this.http.get<InvestmentAccount[]>(`${BASE}/investment-accounts`);
  }
  createInvestmentAccount(item: Partial<InvestmentAccount>): Observable<InvestmentAccount> {
    return this.http.post<InvestmentAccount>(`${BASE}/investment-accounts`, item);
  }
  updateInvestmentAccount(item: InvestmentAccount): Observable<InvestmentAccount> {
    return this.http.put<InvestmentAccount>(`${BASE}/investment-accounts/${item.id}`, item);
  }
  deleteInvestmentAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/investment-accounts/${id}`);
  }

  getProperties(): Observable<Property[]> {
    return this.http.get<Property[]>(`${BASE}/properties`);
  }
  createProperty(item: Partial<Property>): Observable<Property> {
    return this.http.post<Property>(`${BASE}/properties`, item);
  }
  updateProperty(item: Property): Observable<Property> {
    return this.http.put<Property>(`${BASE}/properties/${item.id}`, item);
  }
  deleteProperty(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/properties/${id}`);
  }

  getPropertyValuations(propertyId: number): Observable<PropertyValuation[]> {
    return this.http.get<PropertyValuation[]>(`${BASE}/properties/${propertyId}/valuations`);
  }
  createPropertyValuation(propertyId: number, item: Partial<PropertyValuation>): Observable<PropertyValuation> {
    return this.http.post<PropertyValuation>(`${BASE}/properties/${propertyId}/valuations`, item);
  }
  updatePropertyValuation(propertyId: number, item: PropertyValuation): Observable<PropertyValuation> {
    return this.http.put<PropertyValuation>(`${BASE}/properties/${propertyId}/valuations/${item.id}`, item);
  }
  deletePropertyValuation(propertyId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/properties/${propertyId}/valuations/${id}`);
  }

  getMortgages(): Observable<Mortgage[]> {
    return this.http.get<Mortgage[]>(`${BASE}/mortgages`);
  }
  createMortgage(item: Partial<Mortgage>): Observable<Mortgage> {
    return this.http.post<Mortgage>(`${BASE}/mortgages`, item);
  }
  updateMortgage(item: Mortgage): Observable<Mortgage> {
    return this.http.put<Mortgage>(`${BASE}/mortgages/${item.id}`, item);
  }
  deleteMortgage(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/mortgages/${id}`);
  }

  seed(): Observable<{ accountsAdded: number; investmentAccountsAdded: number; propertiesAdded: number; mortgagesAdded: number }> {
    return this.http.post<{ accountsAdded: number; investmentAccountsAdded: number; propertiesAdded: number; mortgagesAdded: number }>(`${BASE}/seed`, {});
  }

  updateSeedFile(): Observable<{ message: string; path: string }> {
    return this.http.post<{ message: string; path: string }>(`${BASE}/seed/update-file`, {});
  }
}
