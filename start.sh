#!/usr/bin/env bash
# Start NetWorth Navigator backend and frontend. If already running on 5000/4200, kill and restart.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_PORT=5000
FRONTEND_PORT=4200

echo "NetWorth Navigator — start backend + frontend"

# Kill anything on backend/frontend ports (idempotent: no-op if nothing is running)
if command -v fuser &>/dev/null; then
  echo "Checking ports ${BACKEND_PORT} and ${FRONTEND_PORT}..."
  if fuser "${BACKEND_PORT}/tcp" 2>/dev/null || fuser "${FRONTEND_PORT}/tcp" 2>/dev/null; then
    echo "Stopping existing processes on ${BACKEND_PORT} and ${FRONTEND_PORT}..."
    fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
    fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
    sleep 2
  fi
else
  # Fallback: try to kill by port with lsof if fuser not available
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    pid=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      echo "Stopping process on port $port (PID $pid)..."
      kill -9 $pid 2>/dev/null || true
      sleep 2
    fi
  done
fi

cleanup() {
  echo ""
  echo "Stopping backend and frontend..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  if command -v fuser &>/dev/null; then
    fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
    fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting backend (port ${BACKEND_PORT})..."
(cd src/NetWorthNavigator.Backend && dotnet run) &
BACKEND_PID=$!

echo "Starting frontend (port ${FRONTEND_PORT})..."
(cd src/NetWorthNavigator.Frontend && npm start) &
FRONTEND_PID=$!

echo ""
echo "Backend PID: $BACKEND_PID — http://localhost:${BACKEND_PORT}"
echo "Frontend PID: $FRONTEND_PID — http://localhost:${FRONTEND_PORT}"
echo "Press Ctrl+C to stop both."
wait
