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
  currency?: string;
  expectedHeaders: string[];
  columnMapping: { fileColumn: string; dbField: string }[];
  /** File column names (in order) that form the deduplication key. */
  hashFileColumns?: string[];
}

export interface DetectResult {
  detected: boolean;
  configurationId: string | null;
  configuration?: UploadConfiguration;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  /** Distinct OwnAccount values that appeared in the uploaded file. */
  ownAccountsInFile?: string[];
}

export interface UploadPreviewLine {
  date: string | null;
  name: string;
  amount: number;
  currency: string;
  /** "import" | "skip" */
  action: string;
  /** When action is "skip", e.g. "Account not tracked", "Duplicate", "Invalid row" */
  actionReason?: string | null;
}

export interface PreviewResult {
  readyForImport: number;
  toSkip: number;
  lines: UploadPreviewLine[];
  ownAccountsInFile: string[];
}
