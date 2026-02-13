# Starting NetWorth Navigator

## Option 1: Using the start script (Recommended)

```bash
./start-dev.sh
```

This will:
- Clear ports 5000 and 4200
- Start the backend on port 5000 (in background)
- Start the frontend on port 4200 (in foreground)
- Press Ctrl+C to stop both services

## Option 2: Single command (one-liner)

```bash
fuser -k 5000/tcp 2>/dev/null; fuser -k 4200/tcp 2>/dev/null; sleep 2; cd src/NetWorthNavigator.Backend && dotnet run > /tmp/networth-backend.log 2>&1 & sleep 3 && cd ../NetWorthNavigator.Frontend && npm start
```

## Option 3: Manual start (separate terminals)

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

If using the script, press `Ctrl+C` to stop both.

To stop manually:
```bash
fuser -k 5000/tcp 2>/dev/null  # Stop backend
fuser -k 4200/tcp 2>/dev/null  # Stop frontend
```

## Viewing backend logs

If using the script, backend logs are written to `/tmp/networth-backend.log`:
```bash
tail -f /tmp/networth-backend.log
```
