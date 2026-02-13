export interface Bank {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface UploadConfiguration {
  id: string;
  bankId: string;
  name: string;
  description: string;
  delimiter: string;
  expectedHeaders: string[];
  columnMapping: { fileColumn: string; dbField: string }[];
}

export interface DetectResult {
  detected: boolean;
  configurationId: string | null;
  configuration?: UploadConfiguration;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}
