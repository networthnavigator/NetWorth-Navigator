# NetWorth Navigator – Clean Architecture & Domain Driven Design

This document describes how **Clean Architecture** and **Domain Driven Design (DDD)** are applied in this repository.

---

## 1. Clean Architecture (Backend)

The backend is structured in layers. Dependencies point **inward**: outer layers depend on inner layers; the **Domain** does not depend on anything.

```
  ┌─────────────────────────────────────────────────────────┐
  │  Controllers (API / Presentation)                        │  ← HTTP, DTOs
  ├─────────────────────────────────────────────────────────┤
  │  Application (Use cases)                                 │  ← Services, DTOs
  ├─────────────────────────────────────────────────────────┤
  │  Infrastructure (Persistence, file I/O, seeds)           │  ← EF, Repositories
  ├─────────────────────────────────────────────────────────┤
  │  Domain (Entities, Repository interfaces)               │  ← No external deps
  └─────────────────────────────────────────────────────────┘
```

### 1.1 Domain (`Domain/`)

- **Responsibility:** Core business concepts; no dependencies on EF, API, or external libs.
- **Contents:**
  - **Entities** (`Domain/Entities/`): `BankTransactionsHeader`, `AccountStructure`, `LedgerAccount`, `BalanceSheetAccount`, `InvestmentAccount`, `Property`, `PropertyValuation`, `Mortgage`, etc.
  - **Repository interfaces** (`Domain/Repositories/`): `IBalanceSheetAccountRepository`, `ILedgerAccountRepository`, `IBankTransactionsHeaderRepository`, `IAccountStructureRepository`, etc.
- **Rule:** Domain does **not** reference `Microsoft.EntityFrameworkCore`, ASP.NET, or Application/Infrastructure.

### 1.2 Application (`Application/`)

- **Responsibility:** Use cases (orchestration), input/output DTOs.
- **Depends on:** Domain only.
- **Contents:**
  - **DTOs** (`Application/DTOs/`): e.g. `BalanceSheetAccountDto`, `LedgerAccountDto`, request/response shapes.
  - **Application services** (`Application/Services/`): e.g. `IAccountsApplicationService`, `AccountsApplicationService`, `ILedgerApplicationService`, `LedgerApplicationService`. They use repository interfaces and return DTOs.
- **Rule:** Application does **not** reference Infrastructure or Controllers.

### 1.3 Infrastructure (`Infrastructure/`)

- **Responsibility:** Persistence, file I/O, seed data.
- **Depends on:** Domain (implements repository interfaces).
- **Contents:**
  - **Repositories** (`Infrastructure/Repositories/`): e.g. `BalanceSheetAccountRepository`, `LedgerAccountRepository`, `AccountStructureRepository` (implement Domain interfaces using `AppDbContext`).
  - **Persistence:** `Data/AppDbContext.cs` uses **Domain entities** for DbSets and mapping (EF configuration stays here or in Infrastructure).
- **Rule:** Infrastructure implements Domain repository interfaces and uses EF; it does not define use cases.

### 1.4 API / Controllers

- **Responsibility:** HTTP layer only: map requests to application services and DTOs to responses.
- **Depends on:** Application (and Infrastructure only for DI registration in `Program.cs`).
- **Rule:** Controllers do **not** use `AppDbContext` directly for use cases that have an application service; they call application services and return DTOs.

**Example (Accounts):**  
`AccountsController` → `IAccountsApplicationService` → `IBalanceSheetAccountRepository` (implemented by `BalanceSheetAccountRepository` in Infrastructure).

---

## 2. Domain Driven Design (DDD)

- **Bounded contexts** (implicit): e.g. *Transactions* (bank transaction headers), *Chart of Accounts* (structure + ledger accounts), *Assets & Liabilities* (balance-sheet accounts, properties, mortgages).
- **Entities:** Identified by id; live in `Domain/Entities`. Same entities are used by Application (via repositories) and mapped by Infrastructure with EF.
- **Repositories:** Defined in Domain as interfaces; implemented in Infrastructure. They express “what the application needs” from persistence (e.g. `GetAllAsync`, `GetByAssetsCategoryAsync`).
- **Application services:** Represent use cases; keep orchestration and validation in one place; avoid anemic “services” that only forward to repositories by enriching with rules and DTO mapping.

**Optional next steps (DDD):**

- Value objects for money, dates, or account codes where it reduces duplication and invalid states.
- Domain events if multiple aggregates need to react to the same fact.
- More aggregates with clear boundaries (e.g. Transaction aggregate, Ledger aggregate).

---

## 3. Frontend

The frontend (Angular) is not split into “Clean Architecture” projects. Structure:

- **Features / modules:** e.g. `assets-liabilities`, `transacties`, `rekening-schema`, `upload`.
- **Services:** Call backend APIs; return observables of DTOs; no business rules beyond client-side UX.
- **Models:** TypeScript interfaces matching backend DTOs or view models.

For consistency with the backend, keep API contracts (DTOs) aligned with the backend Application layer.

---

## 4. Summary

| Layer          | Folder / namespace              | Role                                      |
|----------------|----------------------------------|-------------------------------------------|
| Domain         | `Domain/`                        | Entities, repository interfaces           |
| Application    | `Application/`                   | Use cases, DTOs, application services     |
| Infrastructure | `Infrastructure/`, `Data/`      | EF DbContext, repository implementations  |
| API            | `Controllers/`, `Program.cs`     | HTTP, DI wiring                           |

**Dependency rule:** Domain ← Application ← Infrastructure; API references Application and Infrastructure (for DI only). Controllers depend on Application, not on Infrastructure types (except via DI registration).
