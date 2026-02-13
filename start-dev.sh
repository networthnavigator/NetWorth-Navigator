#!/bin/bash

# Start NetWorth Navigator - Backend and Frontend
# Usage: ./start-dev.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting NetWorth Navigator...${NC}"

# Kill any existing processes on ports 5000 and 4200
echo -e "${BLUE}Clearing ports 5000 and 4200...${NC}"
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 4200/tcp 2>/dev/null || true
sleep 2

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/src/NetWorthNavigator.Backend"
FRONTEND_DIR="$SCRIPT_DIR/src/NetWorthNavigator.Frontend"

# Start backend in background
echo -e "${GREEN}Starting backend on port 5000...${NC}"
cd "$BACKEND_DIR"
dotnet run > /tmp/networth-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a bit for backend to start
sleep 3

# Start frontend (this will run in foreground)
echo -e "${GREEN}Starting frontend on port 4200...${NC}"
cd "$FRONTEND_DIR"
npm start

# Cleanup function
cleanup() {
    echo -e "\n${BLUE}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    fuser -k 5000/tcp 2>/dev/null || true
    fuser -k 4200/tcp 2>/dev/null || true
    exit
}

# Trap Ctrl+C
trap cleanup INT TERM
