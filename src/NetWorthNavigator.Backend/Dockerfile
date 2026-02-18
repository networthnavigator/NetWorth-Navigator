# Build stage (context is repo root when built via docker-compose)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project and restore (better layer caching)
COPY ["src/NetWorthNavigator.Backend/NetWorthNavigator.Backend.csproj", "NetWorthNavigator.Backend/"]
RUN dotnet restore "NetWorthNavigator.Backend/NetWorthNavigator.Backend.csproj"

# Copy rest of backend and build
COPY ["src/NetWorthNavigator.Backend/", "NetWorthNavigator.Backend/"]
WORKDIR /src/NetWorthNavigator.Backend
RUN dotnet build "NetWorthNavigator.Backend.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "NetWorthNavigator.Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 5000

# Persist SQLite DB in /data (mounted volume in compose)
ENV ConnectionStrings__DefaultConnection="Data Source=/data/networth.db"
ENV ASPNETCORE_URLS=http://+:5000

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "NetWorthNavigator.Backend.dll"]
