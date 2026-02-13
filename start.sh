#!/bin/bash
# Start both backend and frontend
(cd src/NetWorthNavigator.Backend && dotnet run) & (cd src/NetWorthNavigator.Frontend && npm start)
