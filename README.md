# NetWorth Navigator

A personal finance application for tracking expenses, built with .NET 9, Angular 19, and Angular Material. Uses SQLite so no database setup is required.

## User Stories

- ✅ **Track expenses** – View and manage all your expenses
- ✅ **Add expenses manually** – Date, amount (€), and description
- ✅ **View expense list** – See all expenses in the database

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
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

### 3. Open in VS Code

Open `NetWorthNavigator.code-workspace` for a multi-root workspace with Backend and Frontend folders.

Use **Run and Debug** (F5) with the "Launch Backend" configuration to start the backend from VS Code.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List all expenses |
| GET | `/api/expenses/{id}` | Get expense by ID |
| POST | `/api/expenses` | Add a new expense |

### Example: Add expense

```json
POST /api/expenses
Content-Type: application/json

{
  "date": "2025-02-04",
  "value": 42.50,
  "description": "Groceries"
}
```

## Tech Stack

- **Backend:** ASP.NET Core 10, Entity Framework Core 9, SQLite
- **Frontend:** Angular 19, Angular Material 19 (Dutch UI, Euro default)
- **Data:** SQLite (file-based, no setup)

## License

MIT
