export interface LedgerAccount {
  id: number;
  accountStructureId: number;
  accountStructureName: string;
  /** Full path in chart of accounts (e.g. "Activa > Verzekeringen > Autoverzekering") for disambiguation. */
  accountStructurePath?: string;
  code: string;
  name: string;
  sortOrder: number;
}
