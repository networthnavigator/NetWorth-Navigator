/** One line of a booking: debit or credit on a ledger account. */
export interface BookingLineDto {
  id: string;
  lineNumber: number;
  ledgerAccountId: number;
  ledgerAccountCode?: string;
  ledgerAccountName?: string;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description?: string;
}

/** Booking with its lines (e.g. from GET by source document line). */
export interface BookingWithLinesDto {
  id: string;
  date: string;
  reference: string;
  sourceDocumentLineId?: string;
  dateCreated: string;
  createdByUser: string;
  /** When true, user should review this booking before considering it approved. */
  requiresReview: boolean;
  /** When set, the booking has been reviewed/approved by the user. */
  reviewedAt?: string | null;
  lines: BookingLineDto[];
}
