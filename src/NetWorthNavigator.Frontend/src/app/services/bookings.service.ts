import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { BookingWithLinesDto, BookingLineDto } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly apiUrl =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/bookings'
      : '/api/bookings';

  constructor(private http: HttpClient) {}

  /** All bookings with their lines (for preloading balance/review icons). */
  getAll(): Observable<BookingWithLinesDto[]> {
    return this.http.get<BookingWithLinesDto[]>(this.apiUrl);
  }

  /** Booking (with lines) for a transaction document line. Returns null when none exists (404). */
  getBySourceDocumentLine(documentLineId: string): Observable<BookingWithLinesDto | null> {
    return this.http.get<BookingWithLinesDto>(`${this.apiUrl}/by-source-line/${documentLineId}`).pipe(
      catchError(() => of(null)),
    );
  }

  /** Add a line to an existing booking. */
  addLine(bookingId: string, payload: { ledgerAccountId: number; debitAmount: number; creditAmount: number; currency?: string; description?: string | null }): Observable<BookingLineDto> {
    return this.http.post<BookingLineDto>(`${this.apiUrl}/${bookingId}/lines`, {
      ledgerAccountId: payload.ledgerAccountId,
      debitAmount: payload.debitAmount,
      creditAmount: payload.creditAmount,
      currency: payload.currency ?? 'EUR',
      description: payload.description ?? null,
    });
  }

  /** Mark a booking as reviewed/approved by the user. */
  markReviewed(bookingId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${bookingId}/reviewed`, {});
  }
}
