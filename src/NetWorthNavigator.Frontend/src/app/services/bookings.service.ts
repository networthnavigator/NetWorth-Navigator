import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingWithLinesDto } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly apiUrl =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/bookings'
      : '/api/bookings';

  constructor(private http: HttpClient) {}

  getAll(): Observable<BookingWithLinesDto[]> {
    return this.http.get<BookingWithLinesDto[]>(this.apiUrl);
  }
}
