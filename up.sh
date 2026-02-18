#!/usr/bin/env bash
# One-command start: build images and run NetWorth Navigator with Docker Compose.
set -e
cd "$(dirname "$0")"
docker compose up --build -d
echo ""
echo "NetWorth Navigator is running:"
echo "  App:    http://localhost:6000"
echo "  API:    http://localhost:5000"
echo "  Swagger: http://localhost:5000/swagger"
echo ""
echo "Stop with: docker compose down"
