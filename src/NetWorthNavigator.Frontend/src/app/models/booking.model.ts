export interface BookingLineDto {
  id: string;
  lineNumber: number;
  ledgerAccountId: number;
  ledgerAccountCode?: string | null;
  ledgerAccountName?: string | null;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description?: string | null;
}

export interface BookingWithLinesDto {
  id: string;
  date: string;
  reference: string;
  sourceDocumentLineId?: string | null;
  dateCreated: string;
  createdByUser: string;
  lines: BookingLineDto[];
}
