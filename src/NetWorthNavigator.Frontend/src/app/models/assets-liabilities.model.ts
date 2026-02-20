export interface BalanceSheetAccount {
  id: number;
  accountNumber?: string | null;
  name: string;
  currentBalance: number;
  /** Opening balance offset when ledger has partial history. Displayed balance = openingBalanceOffset + ledger balance. */
  openingBalanceOffset?: number | null;
  currency: string;
  sortOrder: number;
  ledgerAccountId?: number | null;
  ledgerAccountName?: string | null;
}

export interface InvestmentAccount {
  id: number;
  name: string;
  currentBalance: number;
  currency: string;
  sortOrder: number;
  ledgerAccountId?: number | null;
  ledgerAccountName?: string | null;
}

export interface Property {
  id: number;
  name: string;
  purchaseValue?: number | null;
  purchaseDate?: string | null;
  currency: string;
  sortOrder: number;
}

export interface PropertyValuation {
  id: number;
  propertyId: number;
  valuationDate: string;
  value: number;
  sortOrder: number;
}

export enum AmortizationType {
  Linear = 0,
  Annuity = 1
}

export interface Mortgage {
  id: number;
  name: string;
  startValue: number;
  interestStartDate: string;
  termYears: number;
  currentInterestRate: number;
  fixedRatePeriodYears: number;
  amortizationType: AmortizationType;
  isPaidOff: boolean;
  currentValue?: number | null;
  extraPaidOff: number;
  currency: string;
  sortOrder: number;
}
