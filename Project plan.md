# NetWorth Navigator – Project Plan

> **Note:** This plan was created at project start. Some sections reflect the current implementation; others describe planned features. Update as the project evolves.

---

## 1. Project Overview

| Field | Description |
|-------|-------------|
| **Name** | NetWorth Navigator |
| **Goal** | Personal finance web app to track and analyze bank transactions, net worth, and financial growth over time |
| **Target Users** | Individuals who want to import and categorize financial data from bank statements |
| **MVP Scope** | Web app to add financial transactions and view them in a list |

---

## 2. Tech Stack

| Area | Technology |
|------|------------|
| **Frontend** | Angular 19 + Angular Material |
| **Backend** | ASP.NET Core 10 (C#) |
| **Database** | SQLite |
| **Languages** | Code: English. Frontend: British English. |

**Conventions:** Backend, database, and repo use English. Frontend is British English with Euro as default currency.

---

## 3. MVP Features

### 3.1 Current Implementation

- Add expenses manually (date, amount, description)
- View all expenses in a list
- Language selection with locale-specific number and currency formatting
- CRUD support (add, list; edit/delete may be planned)

### 3.2 Frontend – MVP Page Specification

**Purpose:** Minimal UI to manually add and view financial transactions.

**Requirements:**
- Form with fields from `BankTransactionsHeaders` that are relevant for manual entry
- Page to view all added transactions with full CRUD
- Fields not used in manual entry will be used later (e.g. imports, CSV processing)

---

## 4. Database Schema

### Table: `BankTransactionsHeaders` (planned)

| Column | Type | Description |
|--------|------|-------------|
| `Id` | GUID | Primary key |
| `Date` | Date | Transaction date |
| `OwnAccount` | String | The account this transaction belongs to (the account from which you downloaded the transactions) |
| `ContraAccount` | String | The other party in the transaction (receiving or paying account; can be a creditor or debtor) |
| `Amount` | Decimal | Signed (positive = credit, negative = debit) |
| `Currency` | String | Always "EUR" |
| `Description` | String | Transaction description |
| `BalanceAfter` | Decimal | Account balance after transaction |
| `OriginalCsvLine` | String | Raw CSV line (string or JSON) |
| `Hash` | String | Unique hash for deduplication |
| `DateCreated` | DateTime | Record creation time |
| `DateUpdated` | DateTime | Last updated time |
| `CreatedByUser` | String | Username |
| `CreatedByProcess` | String | e.g. "Upload" or "Manual" |
| `SourceName` | String | Filename of source CSV |
| `Status` | String | Processing status |
| `Year` | Int | Derived from Date |
| `Period` | String | Format: yyyy-MM |
| `UserComments` | String | Optional user-added notes |

**Current state:** MVP uses a simpler `Expenses` table (Id, Date, Value, Description). The schema above is the target for future phases.

---

## 5. Duplicate Detection (planned)

**Logic:**
- Deduplication based on a hash of:  
  `Date + OwnAccount + ContraAccount + Direction (Debit/Credit) + Amount + BalanceAfter`
- Exclude `Description` (it may change retroactively)
- Use SHA-256 or similar for hashing

---

