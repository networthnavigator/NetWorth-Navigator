/** One imported transaction line (any source: bank, credit card, brokerage, crypto). */
export interface TransactionLine {
  id: string;
  documentId?: string;
  lineNumber?: number;
  date: string;
  ownAccount: string;
  contraAccount: string;
  contraAccountName?: string;
  amount: number;
  currency: string;
  movementType?: string;
  movementTypeLabel?: string;
  description?: string;
  balanceAfter?: number;
  originalCsvLine?: string;
  externalId?: string;
  hash: string;
  dateCreated: string;
  dateUpdated: string;
  createdByUser: string;
  createdByProcess: string;
  sourceName?: string;
  status: string;
  userComments?: string;
  tag?: string;
}
