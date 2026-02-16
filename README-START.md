# Starting NetWorth Navigator

## Manual start (separate terminals)

**Terminal 1 - Backend:**
```bash
cd src/NetWorthNavigator.Backend
dotnet run
```

**Terminal 2 - Frontend:**
```bash
cd src/NetWorthNavigator.Frontend
npm start
```

## Stopping services

Press `Ctrl+C` in each terminal, or:
```bash
fuser -k 5000/tcp 2>/dev/null  # Stop backend
fuser -k 4200/tcp 2>/dev/null  # Stop frontend
```
