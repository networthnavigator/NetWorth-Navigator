using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services - Clean Architecture: Domain repositories (Infrastructure) + Application services
builder.Services.AddScoped<NetWorthNavigator.Backend.Domain.Repositories.IBalanceSheetAccountRepository, NetWorthNavigator.Backend.Infrastructure.Repositories.BalanceSheetAccountRepository>();
builder.Services.AddScoped<NetWorthNavigator.Backend.Domain.Repositories.ILedgerAccountRepository, NetWorthNavigator.Backend.Infrastructure.Repositories.LedgerAccountRepository>();
builder.Services.AddScoped<NetWorthNavigator.Backend.Domain.Repositories.IAccountStructureRepository, NetWorthNavigator.Backend.Infrastructure.Repositories.AccountStructureRepository>();
builder.Services.AddScoped<NetWorthNavigator.Backend.Application.Services.ILedgerBalanceService, NetWorthNavigator.Backend.Services.LedgerBalanceService>();
    builder.Services.AddScoped<NetWorthNavigator.Backend.Application.Services.IAccountsApplicationService, NetWorthNavigator.Backend.Application.Services.AccountsApplicationService>();
builder.Services.AddScoped<NetWorthNavigator.Backend.Application.Services.ILedgerApplicationService, NetWorthNavigator.Backend.Application.Services.LedgerApplicationService>();

builder.Services.AddScoped<AccountStructureImportService>();
builder.Services.AddScoped<LedgerSeedService>();
builder.Services.AddScoped<AssetsLiabilitiesSeedService>();
builder.Services.AddScoped<CsvImportService>();
builder.Services.AddScoped<BookingFromLineService>();
builder.Services.AddScoped<BookingRulesSeedService>();
builder.Services.AddScoped<OwnAccountRuleSyncService>();
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SQLite - no setup required, file is created automatically
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=networth.db"));

// CORS for Angular dev server (and any localhost origin in development)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                var uri = new Uri(origin);
                return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                    || uri.Host == "127.0.0.1";
            })
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

    // Transaction documents (header/line): imports and later manual entry (e.g. cash)
    var hasTransactionDocs = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='TransactionDocuments'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasTransactionDocs)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE TransactionDocuments (
                Id TEXT PRIMARY KEY,
                SourceType TEXT NOT NULL DEFAULT 'Bank',
                SourceName TEXT NOT NULL,
                UploadedAt TEXT NOT NULL,
                CreatedByUser TEXT NOT NULL,
                CreatedByProcess TEXT NOT NULL,
                ConfigurationId TEXT,
                Status TEXT NOT NULL DEFAULT 'Imported')");
    }
    var hasTransactionDocLines = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='TransactionDocumentLines'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasTransactionDocLines)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE TransactionDocumentLines (
                Id TEXT PRIMARY KEY,
                DocumentId TEXT NOT NULL REFERENCES TransactionDocuments(Id) ON DELETE CASCADE,
                LineNumber INTEGER NOT NULL,
                Date TEXT NOT NULL,
                OwnAccount TEXT NOT NULL,
                ContraAccount TEXT NOT NULL,
                ContraAccountName TEXT,
                Amount REAL NOT NULL,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                MovementType TEXT,
                MovementTypeLabel TEXT,
                Description TEXT,
                BalanceAfter REAL,
                OriginalCsvLine TEXT,
                ExternalId TEXT,
                Hash TEXT NOT NULL,
                DateCreated TEXT NOT NULL,
                DateUpdated TEXT NOT NULL,
                CreatedByUser TEXT NOT NULL,
                CreatedByProcess TEXT NOT NULL,
                Status TEXT NOT NULL,
                UserComments TEXT,
                Tag TEXT)");
    }

    // Bookings (double-entry journal entries) and BusinessRules
    var hasBookings = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='Bookings'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasBookings)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE Bookings (
                Id TEXT PRIMARY KEY,
                Date TEXT NOT NULL,
                Reference TEXT NOT NULL,
                SourceDocumentLineId TEXT REFERENCES TransactionDocumentLines(Id),
                DateCreated TEXT NOT NULL,
                CreatedByUser TEXT NOT NULL,
                RequiresReview INTEGER NOT NULL DEFAULT 1,
                ReviewedAt TEXT)");
    }
    var hasBookingLines = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='BookingLines'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasBookingLines)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE BookingLines (
                Id TEXT PRIMARY KEY,
                BookingId TEXT NOT NULL REFERENCES Bookings(Id) ON DELETE CASCADE,
                LineNumber INTEGER NOT NULL,
                LedgerAccountId INTEGER NOT NULL REFERENCES LedgerAccounts(Id),
                DebitAmount REAL NOT NULL DEFAULT 0,
                CreditAmount REAL NOT NULL DEFAULT 0,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                Description TEXT)");
    }
    var hasBusinessRules = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='BusinessRules'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasBusinessRules)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE BusinessRules (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                MatchField TEXT NOT NULL DEFAULT 'ContraAccountName',
                MatchOperator TEXT NOT NULL DEFAULT 'Contains',
                MatchValue TEXT NOT NULL,
                CriteriaJson TEXT NULL,
                LedgerAccountId INTEGER NOT NULL REFERENCES LedgerAccounts(Id),
                SecondLedgerAccountId INTEGER NULL REFERENCES LedgerAccounts(Id),
                SortOrder INTEGER NOT NULL DEFAULT 0,
                IsActive INTEGER NOT NULL DEFAULT 1,
                RequiresReview INTEGER NOT NULL DEFAULT 1)");
    }
    // Migrate existing BusinessRules: add RequiresReview if missing
    if (hasBusinessRules && db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM pragma_table_info('BusinessRules') WHERE name='RequiresReview'").FirstOrDefault() == 0)
        db.Database.ExecuteSqlRaw("ALTER TABLE BusinessRules ADD COLUMN RequiresReview INTEGER NOT NULL DEFAULT 1");
    // Migrate existing BusinessRules: add SecondLedgerAccountId if missing
    if (hasBusinessRules && db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM pragma_table_info('BusinessRules') WHERE name='SecondLedgerAccountId'").FirstOrDefault() == 0)
        db.Database.ExecuteSqlRaw("ALTER TABLE BusinessRules ADD COLUMN SecondLedgerAccountId INTEGER NULL REFERENCES LedgerAccounts(Id)");
    // Migrate existing BusinessRules: add CriteriaJson for multiple criteria per rule
    if (hasBusinessRules && db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM pragma_table_info('BusinessRules') WHERE name='CriteriaJson'").FirstOrDefault() == 0)
        db.Database.ExecuteSqlRaw("ALTER TABLE BusinessRules ADD COLUMN CriteriaJson TEXT NULL");

    // Migrate existing Bookings: add RequiresReview and ReviewedAt if missing
    if (hasBookings)
    {
        if (db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM pragma_table_info('Bookings') WHERE name='RequiresReview'").FirstOrDefault() == 0)
            db.Database.ExecuteSqlRaw("ALTER TABLE Bookings ADD COLUMN RequiresReview INTEGER NOT NULL DEFAULT 1");
        if (db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM pragma_table_info('Bookings') WHERE name='ReviewedAt'").FirstOrDefault() == 0)
            db.Database.ExecuteSqlRaw("ALTER TABLE Bookings ADD COLUMN ReviewedAt TEXT");
    }

    var hasAccountStructures = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='AccountStructures'").OrderBy(x => x).FirstOrDefault() > 0;
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
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='LedgerAccounts'").OrderBy(x => x).FirstOrDefault() > 0;
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
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='BalanceSheetAccounts'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasAccounts)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE BalanceSheetAccounts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                AccountNumber TEXT,
                Name TEXT NOT NULL,
                CurrentBalance REAL NOT NULL DEFAULT 0,
                OpeningBalanceOffset REAL NULL,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                SortOrder INTEGER NOT NULL DEFAULT 0,
                LedgerAccountId INTEGER NULL REFERENCES LedgerAccounts(Id))");
    }
    else
    {
        var hasLedgerAccountId = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) AS Value FROM pragma_table_info('BalanceSheetAccounts') WHERE name = 'LedgerAccountId'").OrderBy(x => x).FirstOrDefault() > 0;
        if (!hasLedgerAccountId)
            db.Database.ExecuteSqlRaw("ALTER TABLE BalanceSheetAccounts ADD COLUMN LedgerAccountId INTEGER NULL REFERENCES LedgerAccounts(Id)");
        var hasAccountNumber = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) AS Value FROM pragma_table_info('BalanceSheetAccounts') WHERE name = 'AccountNumber'").OrderBy(x => x).FirstOrDefault() > 0;
        if (!hasAccountNumber)
            db.Database.ExecuteSqlRaw("ALTER TABLE BalanceSheetAccounts ADD COLUMN AccountNumber TEXT");
        var hasOpeningBalanceOffset = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) AS Value FROM pragma_table_info('BalanceSheetAccounts') WHERE name = 'OpeningBalanceOffset'").OrderBy(x => x).FirstOrDefault() > 0;
        if (!hasOpeningBalanceOffset)
            db.Database.ExecuteSqlRaw("ALTER TABLE BalanceSheetAccounts ADD COLUMN OpeningBalanceOffset REAL NULL");
    }

    var hasInvestmentAccounts = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='InvestmentAccounts'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasInvestmentAccounts)
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE InvestmentAccounts (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                CurrentBalance REAL NOT NULL DEFAULT 0,
                Currency TEXT NOT NULL DEFAULT 'EUR',
                SortOrder INTEGER NOT NULL DEFAULT 0,
                LedgerAccountId INTEGER NULL REFERENCES LedgerAccounts(Id))");
    }
    else
    {
        var hasInvLedger = db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS Value FROM pragma_table_info('InvestmentAccounts') WHERE name='LedgerAccountId'").FirstOrDefault();
        if (hasInvLedger == 0)
            db.Database.ExecuteSqlRaw("ALTER TABLE InvestmentAccounts ADD COLUMN LedgerAccountId INTEGER NULL REFERENCES LedgerAccounts(Id)");
    }

    var hasPropertiesTable = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='Properties'").OrderBy(x => x).FirstOrDefault() > 0;
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
        "SELECT COUNT(*) as Value FROM pragma_table_info('Properties') WHERE name='PurchaseValue'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasPurchaseValue)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE Properties ADD COLUMN PurchaseValue REAL");
        // Migrate existing MarketValue to PurchaseValue
        db.Database.ExecuteSqlRaw("UPDATE Properties SET PurchaseValue = MarketValue WHERE PurchaseValue IS NULL AND MarketValue IS NOT NULL");
    }

    // Add PurchaseDate column to Properties if it doesn't exist
    var hasPurchaseDate = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM pragma_table_info('Properties') WHERE name='PurchaseDate'").OrderBy(x => x).FirstOrDefault() > 0;
    if (!hasPurchaseDate)
    {
        db.Database.ExecuteSqlRaw("ALTER TABLE Properties ADD COLUMN PurchaseDate TEXT");
    }

    var hasPropertyValuations = db.Database.SqlQueryRaw<int>(
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='PropertyValuations'").OrderBy(x => x).FirstOrDefault() > 0;
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
        "SELECT COUNT(*) as Value FROM sqlite_master WHERE type='table' AND name='Mortgages'").OrderBy(x => x).FirstOrDefault() > 0;
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
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='IsPaidOff'").OrderBy(x => x).FirstOrDefault() > 0;
        if (!hasIsPaidOff)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN IsPaidOff INTEGER NOT NULL DEFAULT 0");
        }
        // Add CurrentValue column if it doesn't exist
        var hasCurrentValue = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='CurrentValue'").OrderBy(x => x).FirstOrDefault() > 0;
        if (!hasCurrentValue)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN CurrentValue REAL");
        }
        // Add ExtraPaidOff column if it doesn't exist
        var hasExtraPaidOff = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='ExtraPaidOff'").OrderBy(x => x).FirstOrDefault() > 0;
        if (!hasExtraPaidOff)
        {
            db.Database.ExecuteSqlRaw("ALTER TABLE Mortgages ADD COLUMN ExtraPaidOff REAL NOT NULL DEFAULT 0");
        }
        // Add AmortizationType column if it doesn't exist
        var hasAmortizationType = db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) as Value FROM pragma_table_info('Mortgages') WHERE name='AmortizationType'").OrderBy(x => x).FirstOrDefault() > 0;
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

    // Ensure IsSystemGenerated column exists (for existing DBs created before this property was added)
    try
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE BusinessRules ADD COLUMN IsSystemGenerated INTEGER NOT NULL DEFAULT 0");
    }
    catch
    {
        /* Column already exists or table not yet created */
    }

    // Remove redundant "Own account (by number)" rules so we only have one rule per ledger (match by name; number is resolved via BalanceSheetAccount lookup)
    var byNumberRules = await db.BusinessRules.Where(r => r.MatchField == "OwnAccount" && r.Name != null && r.Name.EndsWith(" (by number)")).ToListAsync();
    foreach (var r in byNumberRules)
    {
        db.BusinessRules.Remove(r);
    }
    await db.SaveChangesAsync();

    // Ensure one OwnAccount rule per BalanceSheetAccount that has a ledger link; match only on account number (rekeningnummer)
    var accountsWithLedger = await db.BalanceSheetAccounts.Where(a => a.LedgerAccountId != null).ToListAsync();
    foreach (var acc in accountsWithLedger)
    {
        var numberMatch = (acc.AccountNumber ?? "").Trim();
        if (string.IsNullOrEmpty(numberMatch)) continue;
        var exists = await db.BusinessRules.AnyAsync(r => r.MatchField == "OwnAccount" && r.MatchValue == numberMatch && r.LedgerAccountId == acc.LedgerAccountId);
        if (!exists)
        {
            db.BusinessRules.Add(new NetWorthNavigator.Backend.Domain.Entities.BusinessRule
            {
                Name = acc.Name ?? numberMatch,
                MatchField = "OwnAccount",
                MatchOperator = "Equals",
                MatchValue = numberMatch,
                LedgerAccountId = acc.LedgerAccountId!.Value,
                SortOrder = 0,
                IsActive = true,
                RequiresReview = false,
                IsSystemGenerated = true,
            });
        }
    }
    await db.SaveChangesAsync();

    // Mark all OwnAccount rules as system-generated (so existing DB rows get the flag)
    await db.BusinessRules.Where(r => r.MatchField == "OwnAccount").ExecuteUpdateAsync(s => s.SetProperty(r => r.IsSystemGenerated, true));

    // One-time: delete all booking rules (user-created and Own-account automatic); remove the next line after the next run if you only want this once
    await db.BusinessRules.ExecuteDeleteAsync();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();

app.Run();

/// <summary>Exposed for integration tests (WebApplicationFactory).</summary>
public partial class Program { }
