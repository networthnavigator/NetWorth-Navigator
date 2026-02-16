#!/usr/bin/env bash
# Build and test: backend build + backend tests; frontend build.
# Exit code 1 if any step fails (so CI or pre-commit can fail the build).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Backend: build ==="
dotnet build NetWorthNavigator.sln -v q

echo "=== Backend: tests ==="
dotnet test src/NetWorthNavigator.Backend.Tests/NetWorthNavigator.Backend.Tests.csproj -v q --no-build

echo "=== Frontend: build ==="
cd src/NetWorthNavigator.Frontend
npm run build
cd "$SCRIPT_DIR"

echo "=== Build + tests OK ==="
