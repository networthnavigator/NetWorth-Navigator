import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Bank,
  UploadConfiguration,
  DetectResult,
  ImportResult,
} from '../models/upload-config.model';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly base =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:5000/api/upload'
      : '/api/upload';

  constructor(private http: HttpClient) {}

  getBanks(): Observable<Bank[]> {
    return this.http.get<Bank[]>(`${this.base}/banks`);
  }

  getConfigurations(bankId: string): Observable<UploadConfiguration[]> {
    return this.http.get<UploadConfiguration[]>(`${this.base}/configurations`, {
      params: { bankId },
    });
  }

  detect(file: File): Observable<DetectResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<DetectResult>(`${this.base}/detect`, form);
  }

  import(file: File, configurationId: string): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('configurationId', configurationId);
    return this.http.post<ImportResult>(`${this.base}/import`, form);
  }

  parseHeaders(file: File, delimiter = ';'): Observable<{ headers: string[]; delimiter: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('delimiter', delimiter);
    return this.http.post<{ headers: string[]; delimiter: string }>(`${this.base}/parse-headers`, form);
  }

  createConfiguration(config: Partial<UploadConfiguration>): Observable<UploadConfiguration> {
    return this.http.post<UploadConfiguration>(`${this.base}/configurations`, config);
  }

  deleteConfiguration(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/configurations/${encodeURIComponent(id)}`);
  }

  /** Mappable columns from BankTransactionsHeaders table */
  getColumnSchema(): Observable<{ id: string; label: string }[]> {
    return this.http.get<{ id: string; label: string }[]>(`${this.base}/column-schema`);
  }

  /** Import file type configurations from seed file */
  seedConfigurations(): Observable<{ configurationsAdded: number }> {
    return this.http.post<{ configurationsAdded: number }>(`${this.base}/seed`, {});
  }

  /** Update seed file with current custom configurations */
  updateConfigurationsSeedFile(): Observable<{ message: string; path: string }> {
    return this.http.post<{ message: string; path: string }>(`${this.base}/seed/update-file`, {});
  }
}
