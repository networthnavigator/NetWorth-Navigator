/** Rule to auto-assign the contra ledger when creating a booking from a transaction line (e.g. counterparty name contains "Albert Heijn" → ledger 4021). */
export interface BookingRule {
  id: number;
  name: string;
  matchField: string;
  matchOperator: string;
  matchValue: string;
  ledgerAccountId: number;
  ledgerAccountCode?: string | null;
  ledgerAccountName?: string | null;
  /** Optional second ledger (e.g. 0773); when set, two contra lines with amount 0 are created. */
  secondLedgerAccountId?: number | null;
  secondLedgerAccountCode?: string | null;
  secondLedgerAccountName?: string | null;
  sortOrder: number;
  isActive: boolean;
  /** When true, bookings created with this rule need user review before approved. Default true for contra rules. */
  requiresReview: boolean;
}

export const MATCH_FIELDS: { id: string; label: string }[] = [
  { id: 'OwnAccount', label: 'Own account (line 1)' },
  { id: 'ContraAccountName', label: 'Counterparty name' },
  { id: 'ContraAccount', label: 'Counterparty account' },
  { id: 'Description', label: 'Description' },
];

export const MATCH_OPERATORS: { id: string; label: string }[] = [
  { id: 'Contains', label: 'Contains' },
  { id: 'Equals', label: 'Equals' },
  { id: 'StartsWith', label: 'Starts with' },
];
