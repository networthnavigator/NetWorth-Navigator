#!/bin/bash
# Stop any backend running on port 5000, then start the backend with latest code
set -e
cd "$(dirname "$0")/src/NetWorthNavigator.Backend"

echo "Stopping any backend on port 5000..."
PID=$(lsof -ti:5000 2>/dev/null || true)
if [ -n "$PID" ]; then
  kill $PID 2>/dev/null || true
  sleep 2
  # Force kill if still running
  lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true
  sleep 1
  echo "Stopped."
else
  echo "No process on port 5000."
fi

echo "Building and starting backend..."
dotnet build
dotnet run
