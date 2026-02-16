# Data and deduplication

## Transaction documents (header/line model)

Transaction data (imports and later manual entry, e.g. cash) uses a **document + lines** model:

- **TransactionDocument:** One record per upload (file) or per manual batch. Fields: `SourceType` (e.g. "Bank", "CreditCard", "Brokerage", "Crypto", "Manual"), `SourceName` (filename or description), `UploadedAt`, `ConfigurationId`, etc.
- **TransactionDocumentLine:** One record per movement, linked to a document. Fields: Date, OwnAccount, ContraAccount, Amount, Currency, Description, Hash, ExternalId, … plus `DocumentId`, `LineNumber`.

The API **`/api/transaction-lines`** returns all lines (with `SourceName` from the document). Own-accounts and delete-all work on this model.

**Deduplication** is per line: the key is ExternalId (when provided by the config) or Hash. Existing keys are loaded from `TransactionDocumentLines` so the same line is not imported twice across all documents.

**Configurable in the upload wizard:** The user chooses which file columns form the deduplication key (e.g. "Hash file columns" in the mapping wizard).

- **One column** selected: that column's value is used as the key (e.g. the bank's transaction ID).
- **Multiple columns** selected: the concatenation of those column values is hashed (SHA-256) and that hash is the key.

## Bookings and business rules (PoC)

- **Booking** (boekingsstuk): In accounting jargon, a booking is the recording of a transaction in the books — a double-entry journal entry. **BookingLine:** One debit or credit line per ledger account. Optional link to a `TransactionDocumentLine` via `SourceDocumentLineId`. Created e.g. via `POST /api/bookings/from-line` (body: `DocumentLineId`, optional `OwnAccountLedgerId`, optional `ContraLedgerAccountId`).
- **BusinessRule:** User-defined rules to suggest the contra ledger account from a document line (e.g. "When ContraAccountName contains 'Albert Heijn' → LedgerAccount Boodschappen"). Used when creating a booking from a line without an explicit `ContraLedgerAccountId`.
