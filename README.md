# NetWorth Navigator

A personal finance application to track assets, liabilities, net worth, and transaction data from multiple sources. Import CSV from bank, credit card, brokerage or crypto; manage a chart of accounts and ledger; create double-entry bookings from transaction lines. Built with .NET 10, Angular 19, and Angular Material. Uses SQLite so no database setup is required.

**Conventions:** Backend, database, and repo use English. Frontend uses British English with Euro as default currency. See [docs/DESIGN.md](docs/DESIGN.md) for frontend/UX design choices (e.g. pages vs dialogs).

## User Stories

- ✅ **Net worth** – Dashboard with assets, liabilities, investments, properties and mortgages
- ✅ **Transaction lines** – Import CSV (per file type), view and manage transaction document lines
- ✅ **Assets & liabilities** – Balance sheet accounts, investment accounts, properties, property valuations, mortgages
- ✅ **Chart of accounts** – Account structure and ledger accounts (IFRS/UK GAAP style)
- ✅ **Bookings** – Create double-entry bookings from transaction lines; business rules for contra account (PoC)

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download) (or .NET 9)
- [Node.js 20+](https://nodejs.org/) (LTS recommended)
- npm (included with Node.js)

## Project Structure

```
NetWorth Navigator/
├── docs/
│   └── ARCHITECTURE.md            # Clean Architecture & DDD (backend)
├── src/
│   ├── NetWorthNavigator.Backend/   # ASP.NET Core Web API + SQLite
│   │   ├── Domain/                  # Entities, repository interfaces (DDD)
│   │   ├── Application/             # Use cases, DTOs, application services
│   │   ├── Infrastructure/          # Repository implementations, persistence
│   │   ├── Controllers/             # API layer (thin, delegates to Application)
│   │   ├── Data/                    # DbContext, seeds
│   │   └── Services/                # Seed/import infrastructure services
│   └── NetWorthNavigator.Frontend/  # Angular + Material frontend
└── .vscode/                       # VS Code launch & tasks
```

The backend follows **Clean Architecture** and **Domain Driven Design**. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Build Docker images (deployment)

From the project root, run:

```bash
./BuildImage.sh
```

This builds the backend and frontend Docker images (versioned with timestamp), saves them to tar files, and creates a deployment package. See the script for output location and usage.

For local build and tests without Docker:
- Backend build: `dotnet build NetWorthNavigator.sln`
- Backend tests: `dotnet test src/NetWorthNavigator.Backend.Tests/NetWorthNavigator.Backend.Tests.csproj`
- Frontend build: `cd src/NetWorthNavigator.Frontend && npm run build`

## Running the Application

### Single command (recommended)

From the project root, run:

```bash
./start.sh
```

This script checks if the backend (port 5000) or frontend (port 4200) are already running. If so, it stops them and then starts both. Otherwise it starts both. Press **Ctrl+C** to stop backend and frontend.

Make sure `npm install` has been run at least once in `src/NetWorthNavigator.Frontend` before using `./start.sh`.

### Manual start

**Backend:**

```bash
cd src/NetWorthNavigator.Backend
dotnet run
```

The backend runs at `http://localhost:5000`. Swagger UI: `http://localhost:5000/swagger`.

SQLite database `networth.db` is created automatically in the backend project directory.

**Frontend:**

```bash
cd src/NetWorthNavigator.Frontend
npm install
npm start
```

The app runs at `http://localhost:4200`. API requests are proxied to the backend via `proxy.conf.json`.

### Building Docker Images

To build versioned Docker images for deployment:

```bash
./BuildImage.sh
```

This script:
- Builds backend and frontend Docker images with version tags (format: `yyyymmdd.hhmmss`)
- Saves images as tar files to `/home/ewout/Documents/NetWorth-Navigator-images`
- Creates a `docker-compose.yml` for deployment
- Archives old versions to the `archive` subfolder

To load and run locally:

```bash
cd /home/ewout/Documents/NetWorth-Navigator-images
docker load -i networth-navigator-backend-<version>.tar
docker load -i networth-navigator-frontend-<version>.tar
docker compose up -d
```

The app runs at **http://localhost:6000** and the API at **http://localhost:5000**. Stop with `docker compose down`.

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2).

### Open in VS Code

Open `NetWorthNavigator.code-workspace` for a multi-root workspace with Backend and Frontend folders.

Use **Run and Debug** (F5) with the "Launch Backend" configuration to start the backend from VS Code.

## API Endpoints (main)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transaction-lines` | List all transaction document lines |
| GET | `/api/transaction-lines/own-accounts` | Distinct own-account values (for balance sheet) |
| DELETE | `/api/transaction-lines` | Delete all transaction documents and lines |
| GET | `/api/accounts` | Balance sheet accounts |
| GET | `/api/ledger` | Ledger accounts (chart of accounts) |
| POST | `/api/upload/import` | Import CSV (form: file, configurationId) |
| POST | `/api/bookings/from-line` | Create a booking from a transaction line (PoC) |

See Swagger at `http://localhost:5000/swagger` for the full API.

## Tech Stack

- **Backend:** ASP.NET Core 10, Entity Framework Core 9, SQLite
- **Frontend:** Angular 19, Angular Material 19 (Dutch UI, Euro default)
- **Data:** SQLite (file-based, no setup)

## License

MIT
