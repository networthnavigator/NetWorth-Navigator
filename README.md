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
├── NetWorthNavigator.sln          # .NET solution
├── NetWorthNavigator.code-workspace  # VS Code workspace
├── src/
│   ├── NetWorthNavigator.Backend/   # ASP.NET Core Web API + SQLite
│   └── NetWorthNavigator.Frontend/  # Angular + Material frontend
└── .vscode/                       # VS Code launch & tasks
```

## Running the Application

### 1. Backend

```bash
cd src/NetWorthNavigator.Backend
dotnet run
```

The backend runs at `http://localhost:5000`. Swagger UI: `http://localhost:5000/swagger`.

SQLite database `networth.db` is created automatically in the backend project directory.

### 2. Frontend

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
