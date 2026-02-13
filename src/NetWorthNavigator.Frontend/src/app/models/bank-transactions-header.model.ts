export interface BankTransactionsHeader {
  id: string;
  date: string;
  ownAccount: string;
  contraAccount: string;
  amount: number;
  currency: string;
  description?: string;
  balanceAfter?: number;
  originalCsvLine?: string;
  hash: string;
  dateCreated: string;
  dateUpdated: string;
  createdByUser: string;
  createdByProcess: string;
  sourceName?: string;
  status: string;
  year: number;
  period: string;
  userComments?: string;
  tag?: string;
}
