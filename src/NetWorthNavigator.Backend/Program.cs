using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddScoped<AccountStructureImportService>();
builder.Services.AddScoped<LedgerSeedService>();
builder.Services.AddScoped<AssetsLiabilitiesSeedService>();
builder.Services.AddScoped<CsvImportService>();
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SQLite - no setup required, file is created automatically
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=networth.db"));

// CORS for Angular dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Ensure database is created and add Currency column if missing
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    var hasBankHeaders = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='BankTransactionsHeaders'").FirstOrDefault() > 0;
    if (hasBankHeaders)
    {
        var hasTag = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('BankTransactionsHeaders') WHERE name='Tag'").FirstOrDefault() > 0;
        if (!hasTag)
            db.Database.ExecuteSqlRaw("ALTER TABLE BankTransactionsHeaders ADD COLUMN Tag TEXT");
        var hasAccountNumber = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('BankTransactionsHeaders') WHERE name='AccountNumber'").FirstOrDefault() > 0;
        if (hasAccountNumber)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE BankTransactionsHeaders RENAME COLUMN AccountNumber TO OwnAccount");
            db.Database.ExecuteSqlRaw("ALTER TABLE BankTransactionsHeaders RENAME COLUMN Counterparty TO ContraAccount");
        }
    }
    else
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE BankTransactionsHeaders (
                Id TEXT PRIMARY KEY,
                Date TEXT NOT NULL,
                OwnAccount TEXT NOT NULL,
                ContraAccount TEXT NOT NULL,
                Amount REAL NOT NULL,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                Description TEXT,
                BalanceAfter REAL,
                OriginalCsvLine TEXT,
                Hash TEXT NOT NULL,
                DateCreated TEXT NOT NULL,
                DateUpdated TEXT NOT NULL,
                CreatedByUser TEXT NOT NULL,
                CreatedByProcess TEXT NOT NULL,
                SourceName TEXT,
                Status TEXT NOT NULL,
                Year INTEGER NOT NULL,
                Period TEXT NOT NULL,
                UserComments TEXT,
                Tag TEXT)");

    var hasAccountStructures = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='AccountStructures'").FirstOrDefault() > 0;
    if (!hasAccountStructures)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE AccountStructures (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                ParentId INTEGER REFERENCES AccountStructures(Id),
                Level INTEGER NOT NULL,
                Code TEXT NOT NULL,
                Name TEXT NOT NULL,
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }

    var hasLedgerAccounts = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='LedgerAccounts'").FirstOrDefault() > 0;
    if (!hasLedgerAccounts)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE LedgerAccounts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AccountStructureId INTEGER NOT NULL REFERENCES AccountStructures(Id),
                Code TEXT NOT NULL,
                Name TEXT NOT NULL,
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }

    var hasAccounts = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='BalanceSheetAccounts'").FirstOrDefault() > 0;
    if (!hasAccounts)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE BalanceSheetAccounts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                CurrentBalance REAL NOT NULL DEFAULT 0,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }

    var hasInvestmentAccounts = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='InvestmentAccounts'").FirstOrDefault() > 0;
    if (!hasInvestmentAccounts)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE InvestmentAccounts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                CurrentBalance REAL NOT NULL DEFAULT 0,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }

    var hasPropertiesTable = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='Properties'").FirstOrDefault() > 0;
    if (!hasPropertiesTable)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE Properties (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                PurchaseValue REAL,
                PurchaseDate TEXT,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }

    // Add PurchaseValue column to Properties if it doesn't exist (replaces MarketValue)
    var hasPurchaseValue = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM pragma_table_info('Properties') WHERE name='PurchaseValue'").FirstOrDefault() > 0;
    if (!hasPurchaseValue)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE Properties ADD COLUMN PurchaseValue REAL");
        // Migrate existing MarketValue to PurchaseValue
        db.Database.ExecuteSqlRaw("UPDATE Properties SET PurchaseValue = MarketValue WHERE PurchaseValue IS NULL AND MarketValue IS NOT NULL");
    }

    // Add PurchaseDate column to Properties if it doesn't exist
    var hasPurchaseDate = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM pragma_table_info('Properties') WHERE name='PurchaseDate'").FirstOrDefault() > 0;
    if (!hasPurchaseDate)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE Properties ADD COLUMN PurchaseDate TEXT");
    }

    var hasPropertyValuations = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='PropertyValuations'").FirstOrDefault() > 0;
    if (!hasPropertyValuations)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE PropertyValuations (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                PropertyId INTEGER NOT NULL REFERENCES Properties(Id) ON DELETE CASCADE,
                ValuationDate TEXT NOT NULL,
                Value REAL NOT NULL DEFAULT 0,
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }

    var hasMortgages = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='Mortgages'").FirstOrDefault() > 0;
    if (!hasMortgages)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE Mortgages (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                StartValue REAL NOT NULL DEFAULT 0,
                InterestStartDate TEXT NOT NULL,
                TermYears INTEGER NOT NULL DEFAULT 0,
                CurrentInterestRate REAL NOT NULL DEFAULT 0,
                FixedRatePeriodYears INTEGER NOT NULL DEFAULT 0,
                AmortizationType INTEGER NOT NULL DEFAULT 0,
                IsPaidOff INTEGER NOT NULL DEFAULT 0,
                CurrentValue REAL,
                ExtraPaidOff REAL NOT NULL DEFAULT 0,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                SortOrder INTEGER NOT NULL DEFAULT 0)");
    }
    else
    {
        // Add IsPaidOff column if it doesn't exist
        var hasIsPaidOff = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='IsPaidOff'").FirstOrDefault() > 0;
        if (!hasIsPaidOff)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN IsPaidOff INTEGER NOT NULL DEFAULT 0");
        }
        // Add CurrentValue column if it doesn't exist
        var hasCurrentValue = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='CurrentValue'").FirstOrDefault() > 0;
        if (!hasCurrentValue)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN CurrentValue REAL");
        }
        // Add ExtraPaidOff column if it doesn't exist
        var hasExtraPaidOff = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='ExtraPaidOff'").FirstOrDefault() > 0;
        if (!hasExtraPaidOff)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN ExtraPaidOff REAL NOT NULL DEFAULT 0");
        }
        // Add AmortizationType column if it doesn't exist
        var hasAmortizationType = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='AmortizationType'").FirstOrDefault() > 0;
        if (!hasAmortizationType)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN AmortizationType INTEGER NOT NULL DEFAULT 0");
        }
    }

    // Seed account structure from Seeds/account-structure-seed.json when empty
    if (await db.AccountStructures.CountAsync() == 0)
    {
        var structurePath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "account-structure-seed.json");
        if (File.Exists(structurePath))
        {
            var importService = scope.ServiceProvider.GetRequiredService<AccountStructureImportService>();
            await importService.ImportStructureAsync(await File.ReadAllTextAsync(structurePath));
        }
    }

    // Seed ledger accounts from Seeds/ledger-accounts-seed.json when empty (references structure by accountStructureCode)
    if (await db.LedgerAccounts.CountAsync() == 0)
    {
        var ledgerPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "ledger-accounts-seed.json");
        if (File.Exists(ledgerPath))
        {
            var ledgerSeed = scope.ServiceProvider.GetRequiredService<LedgerSeedService>();
            await ledgerSeed.ImportFromJsonAsync(await File.ReadAllTextAsync(ledgerPath));
        }
    }
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();

app.Run();
