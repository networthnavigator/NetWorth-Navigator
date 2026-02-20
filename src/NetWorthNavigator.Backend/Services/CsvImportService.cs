using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Services;

public class CsvImportService
{
    private readonly AppDbContext _context;
    private readonly BookingFromLineService _bookingFromLineService;
    private static readonly object _customConfigLock = new();
    private static List<UploadConfigurationDto>? _customConfigs;

    public CsvImportService(AppDbContext context, BookingFromLineService bookingFromLineService)
    {
        _context = context;
        _bookingFromLineService = bookingFromLineService;
    }

    public static IReadOnlyList<BankDto> Banks { get; } =
    [
        new BankDto { Id = "ing", Name = "ING", LogoUrl = "/assets/ing-logo.png" },
        new BankDto { Id = "abnamro", Name = "ABN AMRO", LogoUrl = "/assets/abnamro-logo.png" },
        new BankDto { Id = "rabobank", Name = "Rabobank", LogoUrl = "/assets/rabobank-logo.png" },
        new BankDto { Id = "triodos", Name = "Triodos Bank", LogoUrl = "/assets/triodos-logo.png" },
    ];

    private static List<UploadConfigurationDto> GetCustomConfigurations()
    {
        if (_customConfigs != null) return _customConfigs;
        lock (_customConfigLock)
        {
            if (_customConfigs != null) return _customConfigs;
            _customConfigs = new List<UploadConfigurationDto>();
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "upload-configurations.json");
            if (File.Exists(path))
            {
                try
                {
                    var json = File.ReadAllText(path);
                    var list = JsonSerializer.Deserialize<List<UploadConfigurationDto>>(json);
                    if (list != null) _customConfigs = list;
                }
                catch { /* ignore */ }
            }
            return _customConfigs;
        }
    }

    private static IEnumerable<UploadConfigurationDto> AllConfigurations => GetCustomConfigurations();

    public IReadOnlyList<UploadConfigurationDto> GetConfigurationsByBank(string bankId) =>
        AllConfigurations.Where(c => c.BankId.Equals(bankId, StringComparison.OrdinalIgnoreCase)).ToList();

    public async Task<UploadConfigurationDto> SaveConfigurationAsync(UploadConfigurationDto config, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(config.BankId))
            throw new ArgumentException("BankId is required");
        if (string.IsNullOrWhiteSpace(config.Name))
            throw new ArgumentException("Name is required");
        config.Id = $"custom-{Guid.NewGuid():N}";
        if (string.IsNullOrWhiteSpace(config.Delimiter)) config.Delimiter = ";";
        if (string.IsNullOrWhiteSpace(config.Currency)) config.Currency = "EUR";
        var custom = GetCustomConfigurations();
        lock (_customConfigLock)
        {
            custom.Add(config);
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "upload-configurations.json");
            var json = JsonSerializer.Serialize(custom, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(path, json);
        }
        return await Task.FromResult(config);
    }

    public (string[] Headers, string Delimiter) ParseHeaders(Stream csvStream, string delimiter = ";")
    {
        csvStream.Position = 0;
        using var reader = new StreamReader(csvStream, Encoding.UTF8, leaveOpen: true);
        var firstLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(firstLine)) return ([], delimiter);
        var headers = ParseCsvLine(firstLine, delimiter);
        return (headers.Select(h => h.Trim().Trim('"')).ToArray(), delimiter);
    }

    public UploadConfigurationDto? GetConfigurationById(string id) =>
        AllConfigurations.FirstOrDefault(c => c.Id.Equals(id, StringComparison.OrdinalIgnoreCase));

    /// <summary>Deletes a configuration by id. Returns true if removed.</summary>
    public async Task<bool> DeleteConfigurationAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
            return false;
        var custom = GetCustomConfigurations();
        var index = custom.FindIndex(c => c.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
        if (index < 0)
            return false;
        lock (_customConfigLock)
        {
            custom.RemoveAt(index);
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "upload-configurations.json");
            var json = JsonSerializer.Serialize(custom.ToList(), new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(path, json);
            InvalidateCustomConfigurationsCache();
        }
        return await Task.FromResult(true);
    }

    /// <summary>Exports current custom configurations to JSON (for seed file).</summary>
    public string ExportCustomConfigurationsToJson()
    {
        var custom = GetCustomConfigurations();
        return JsonSerializer.Serialize(custom.ToList(), new JsonSerializerOptions { WriteIndented = true });
    }

    /// <summary>Imports configurations from seed JSON and merges with existing custom configs (by Id). Returns number added.</summary>
    public async Task<int> ImportSeedAsync(string seedJson, CancellationToken ct = default)
    {
        var seedList = JsonSerializer.Deserialize<List<UploadConfigurationDto>>(seedJson);
        if (seedList == null || seedList.Count == 0)
            return 0;
        var custom = GetCustomConfigurations();
        var existingIds = new HashSet<string>(custom.Select(c => c.Id), StringComparer.OrdinalIgnoreCase);
        int added = 0;
        lock (_customConfigLock)
        {
            foreach (var config in seedList)
            {
                if (string.IsNullOrWhiteSpace(config.BankId) || string.IsNullOrWhiteSpace(config.Name))
                    continue;
                if (existingIds.Contains(config.Id))
                    continue;
                config.Id = string.IsNullOrWhiteSpace(config.Id) ? $"custom-{Guid.NewGuid():N}" : config.Id;
                if (string.IsNullOrWhiteSpace(config.Delimiter)) config.Delimiter = ";";
                custom.Add(config);
                existingIds.Add(config.Id);
                added++;
            }
            var path = Path.Combine(AppContext.BaseDirectory, "Data", "upload-configurations.json");
            var json = JsonSerializer.Serialize(custom.ToList(), new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(path, json);
            InvalidateCustomConfigurationsCache();
        }
        return await Task.FromResult(added);
    }

    /// <summary>Clears the in-memory cache so next read loads from file.</summary>
    public static void InvalidateCustomConfigurationsCache()
    {
        lock (_customConfigLock)
        {
            _customConfigs = null;
        }
    }

    public string? DetectConfiguration(Stream csvStream)
    {
        using var reader = new StreamReader(csvStream, Encoding.UTF8, leaveOpen: true);
        var firstLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(firstLine)) return null;

        var headers = ParseCsvLine(firstLine, ";");
        if (headers.Length == 0) return null;

        var normalized = headers.Select(h => h.Trim().Trim('"')).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var config in AllConfigurations)
        {
            var allPresent = config.ExpectedHeaders.All(h =>
                normalized.Contains(h.Trim().Trim('"')));
            if (allPresent) return config.Id;
        }

        return null;
    }

    public async Task<(int Imported, int Skipped, IReadOnlyList<string> OwnAccountsInFile)> ImportAsync(
        Stream csvStream,
        string configurationId,
        string fileName,
        CancellationToken ct = default)
    {
        var config = AllConfigurations.FirstOrDefault(c =>
            c.Id.Equals(configurationId, StringComparison.OrdinalIgnoreCase));
        if (config == null)
            throw new ArgumentException($"Configuration '{configurationId}' not found.");

        csvStream.Position = 0;
        using var reader = new StreamReader(csvStream, Encoding.UTF8, leaveOpen: true);

        var headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
            return (0, 0, Array.Empty<string>());

        var headers = ParseCsvLine(headerLine, config.Delimiter);
        var headerNames = headers.Select(h => h.Trim().Trim('"')).ToArray();

        var dataLines = new List<string>();
        while (reader.ReadLine() is { } line)
        {
            if (!string.IsNullOrWhiteSpace(line))
                dataLines.Add(line);
        }

        var now = DateTime.UtcNow;
        var user = "User";

        // First pass: compute dedup key per line, count key frequency, and collect distinct OwnAccount values in file (no document yet).
        var lineEntries = new List<(string Key, string Line)>();
        var ownAccountsInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var skippedInvalid = 0;
        foreach (var line in dataLines)
        {
            var row = LineToRow(line, config.Delimiter, headerNames);
            var documentLine = MapToTransactionDocumentLine(config, row, Guid.Empty, 0, now, user, line);
            if (documentLine == null) { skippedInvalid++; continue; }
            var key = documentLine.ExternalId ?? documentLine.Hash;
            lineEntries.Add((key, line));
            if (!string.IsNullOrWhiteSpace(documentLine.OwnAccount))
                ownAccountsInFile.Add(documentLine.OwnAccount.Trim());
        }

        // Only import lines for accounts that are tracked (BalanceSheetAccount with LedgerAccountId). Match by Name or AccountNumber.
        var trackedOwnAccountKeys = await GetTrackedOwnAccountKeysAsync(ct);

        // Dedup key = ExternalId when provided, otherwise Hash. Load existing keys from all document lines.
        var existingKeyList = await _context.TransactionDocumentLines
            .Select(l => l.ExternalId != null ? l.ExternalId : l.Hash)
            .ToListAsync(ct);
        var existingKeys = new HashSet<string>(existingKeyList, StringComparer.OrdinalIgnoreCase);

        // Header/line model: one document per file, N lines per document.
        var doc = new TransactionDocument
        {
            Id = Guid.NewGuid(),
            SourceType = string.IsNullOrWhiteSpace(config.BankId) ? "Bank" : config.BankId,
            SourceName = fileName,
            UploadedAt = now,
            CreatedByUser = user,
            CreatedByProcess = "Upload",
            ConfigurationId = config.Id,
            Status = "Imported",
        };
        _context.TransactionDocuments.Add(doc);

        var keyCountInFile = lineEntries
            .GroupBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Count());

        var imported = 0;
        var skipped = skippedInvalid;
        var lineNumber = 0;

        foreach (var (key, line) in lineEntries)
        {
            try
            {
                if (existingKeys.Contains(key) && keyCountInFile[key] <= 1)
                {
                    skipped++;
                    continue;
                }

                var row = LineToRow(line, config.Delimiter, headerNames);
                var documentLine = MapToTransactionDocumentLine(config, row, doc.Id, lineNumber, now, user, line);
                if (documentLine == null) { skipped++; continue; }

                // Only import lines for accounts that are tracked (linked to a ledger)
                if (!IsOwnAccountTracked(documentLine.OwnAccount, trackedOwnAccountKeys))
                {
                    skipped++;
                    continue;
                }

                _context.TransactionDocumentLines.Add(documentLine);
                try
                {
                    await _bookingFromLineService.CreateBookingForLineAsync(documentLine, doc, null, null, ct);
                }
                catch
                {
                    _context.TransactionDocumentLines.Remove(documentLine);
                    skipped++;
                    continue;
                }
                existingKeys.Add(key);
                imported++;
                lineNumber++;
            }
            catch
            {
                skipped++;
            }
        }

        await _context.SaveChangesAsync(ct);
        return (imported, skipped, ownAccountsInFile.ToList().AsReadOnly());
    }

    /// <summary>Preview import: parse file and return what would be imported vs skipped, without saving.</summary>
    public async Task<(int ReadyForImport, int ToSkip, IReadOnlyList<UploadPreviewLineDto> Lines, IReadOnlyList<string> OwnAccountsInFile)> PreviewAsync(
        Stream csvStream,
        string configurationId,
        CancellationToken ct = default)
    {
        var config = AllConfigurations.FirstOrDefault(c =>
            c.Id.Equals(configurationId, StringComparison.OrdinalIgnoreCase));
        if (config == null)
            throw new ArgumentException($"Configuration '{configurationId}' not found.");

        csvStream.Position = 0;
        using var reader = new StreamReader(csvStream, Encoding.UTF8, leaveOpen: true);

        var headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
            return (0, 0, Array.Empty<UploadPreviewLineDto>(), Array.Empty<string>());

        var headers = ParseCsvLine(headerLine, config.Delimiter);
        var headerNames = headers.Select(h => h.Trim().Trim('"')).ToArray();

        var dataLines = new List<string>();
        while (reader.ReadLine() is { } line)
        {
            if (!string.IsNullOrWhiteSpace(line))
                dataLines.Add(line);
        }

        var dummyDocId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var user = "User";

        var existingKeyList = await _context.TransactionDocumentLines
            .Select(l => l.ExternalId != null ? l.ExternalId : l.Hash)
            .ToListAsync(ct);
        var existingKeys = new HashSet<string>(existingKeyList, StringComparer.OrdinalIgnoreCase);

        var lineEntries = new List<(string Key, string Line)>();
        var ownAccountsInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in dataLines)
        {
            var row = LineToRow(line, config.Delimiter, headerNames);
            var documentLine = MapToTransactionDocumentLine(config, row, dummyDocId, 0, now, user, line);
            if (documentLine == null) continue;
            var key = documentLine.ExternalId ?? documentLine.Hash;
            lineEntries.Add((key, line));
            if (!string.IsNullOrWhiteSpace(documentLine.OwnAccount))
                ownAccountsInFile.Add(documentLine.OwnAccount.Trim());
        }

        var keyCountInFile = lineEntries
            .GroupBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Count());

        var trackedOwnAccountKeys = await GetTrackedOwnAccountKeysAsync(ct);

        var previewLines = new List<UploadPreviewLineDto>();
        var readyForImport = 0;
        var toSkip = 0;
        var lineNumber = 0;

        foreach (var (key, line) in lineEntries)
        {
            var row = LineToRow(line, config.Delimiter, headerNames);
            var documentLine = MapToTransactionDocumentLine(config, row, dummyDocId, lineNumber, now, user, line);
            if (documentLine == null)
            {
                toSkip++;
                previewLines.Add(new UploadPreviewLineDto
                {
                    Date = null,
                    Name = "(invalid row)",
                    Amount = 0,
                    Currency = config.Currency ?? "EUR",
                    Action = "skip",
                    ActionReason = "Invalid row",
                });
                continue;
            }

            var name = documentLine.ContraAccountName ?? documentLine.Description ?? documentLine.ContraAccount ?? "";

            // Only lines for tracked accounts (linked to a ledger) are imported
            if (!IsOwnAccountTracked(documentLine.OwnAccount, trackedOwnAccountKeys))
            {
                toSkip++;
                previewLines.Add(new UploadPreviewLineDto
                {
                    Date = documentLine.Date.ToString("yyyy-MM-dd"),
                    Name = name,
                    Amount = documentLine.Amount,
                    Currency = documentLine.Currency,
                    Action = "skip",
                    ActionReason = "Account not tracked",
                });
                continue;
            }

            var wouldSkip = existingKeys.Contains(key) && keyCountInFile[key] <= 1;
            if (wouldSkip)
            {
                toSkip++;
                previewLines.Add(new UploadPreviewLineDto
                {
                    Date = documentLine.Date.ToString("yyyy-MM-dd"),
                    Name = name,
                    Amount = documentLine.Amount,
                    Currency = documentLine.Currency,
                    Action = "skip",
                    ActionReason = "Duplicate",
                });
            }
            else
            {
                readyForImport++;
                existingKeys.Add(key);
                previewLines.Add(new UploadPreviewLineDto
                {
                    Date = documentLine.Date.ToString("yyyy-MM-dd"),
                    Name = name,
                    Amount = documentLine.Amount,
                    Currency = documentLine.Currency,
                    Action = "import",
                });
                lineNumber++;
            }
        }

        return (readyForImport, toSkip, previewLines, ownAccountsInFile.ToList().AsReadOnly());
    }

    private static Dictionary<string, string> LineToRow(string line, string delimiter, string[] headerNames)
    {
        var values = ParseCsvLine(line, delimiter);
        var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < headerNames.Length && i < values.Length; i++)
            row[headerNames[i]] = values[i].Trim().Trim('"');
        return row;
    }

    private static string GetMappedValue(Dictionary<string, string> row, UploadConfigurationDto config, string dbField)
    {
        var mapping = config.ColumnMapping?.FirstOrDefault(m =>
            string.Equals(m.DbField, dbField, StringComparison.OrdinalIgnoreCase));
        return mapping != null ? GetValue(row, mapping.FileColumn) ?? "" : "";
    }

    private static TransactionDocumentLine? MapToTransactionDocumentLine(
        UploadConfigurationDto config,
        Dictionary<string, string> row,
        Guid documentId,
        int lineNumber,
        DateTime now,
        string user,
        string rawLine)
    {
        var dateStr = GetMappedValue(row, config, "Date");
        if (string.IsNullOrWhiteSpace(dateStr)) return null;
        if (!DateTime.TryParseExact(dateStr, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) &&
            !DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            return null;

        decimal amount = 0;
        var amountStr = GetMappedValue(row, config, "Amount");
        if (!string.IsNullOrEmpty(amountStr))
        {
            var parsed = decimal.TryParse(amountStr.Replace(",", "."),
                NumberStyles.Any, CultureInfo.InvariantCulture, out var a)
                ? a
                : 0;
            var sign = GetMappedValue(row, config, "_AmountSign");
            amount = string.Equals(sign, "Af", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(sign, "Debit", StringComparison.OrdinalIgnoreCase)
                ? -parsed
                : parsed;
        }

        var ownAccount = GetMappedValue(row, config, "OwnAccount");
        var contraAccount = GetMappedValue(row, config, "ContraAccount");
        var contraAccountName = GetMappedValue(row, config, "ContraAccountName");
        var description = GetMappedValue(row, config, "Description");
        var movementType = GetMappedValue(row, config, "MovementType");
        var movementTypeLabel = GetMappedValue(row, config, "MovementTypeLabel");
        var tag = GetMappedValue(row, config, "Tag");
        var balanceStr = GetMappedValue(row, config, "BalanceAfter");
        decimal? balanceAfter = null;
        if (!string.IsNullOrEmpty(balanceStr) &&
            decimal.TryParse(balanceStr.Replace(",", "."), NumberStyles.Any, CultureInfo.InvariantCulture, out var b))
            balanceAfter = b;

        string? externalId = null;
        string hash;
        if (config.HashFileColumns is { Length: > 0 })
        {
            var keyParts = config.HashFileColumns.Select(col => GetValue(row, col) ?? "").ToList();
            var keyString = string.Join("|", keyParts);
            if (config.HashFileColumns.Length == 1)
            {
                externalId = string.IsNullOrWhiteSpace(keyString) ? null : keyString.Trim();
                hash = string.IsNullOrWhiteSpace(keyString) ? ComputeHash($"{date:yyyy-MM-dd}|{ownAccount}|{contraAccount}|{amount}|{balanceAfter}") : keyString.Trim();
            }
            else
            {
                hash = ComputeHash(keyString);
            }
        }
        else
        {
            var externalIdRaw = GetMappedValue(row, config, "ExternalId");
            externalId = string.IsNullOrWhiteSpace(externalIdRaw) ? null : externalIdRaw.Trim();
            hash = string.IsNullOrWhiteSpace(externalId)
                ? ComputeHash($"{date:yyyy-MM-dd}|{ownAccount}|{contraAccount}|{amount}|{balanceAfter}")
                : externalId;
        }

        return new TransactionDocumentLine
        {
            Id = Guid.NewGuid(),
            DocumentId = documentId,
            LineNumber = lineNumber,
            Date = date,
            OwnAccount = ownAccount,
            ContraAccount = contraAccount,
            ContraAccountName = string.IsNullOrWhiteSpace(contraAccountName) ? null : contraAccountName.Trim(),
            Amount = amount,
            Currency = string.IsNullOrWhiteSpace(config.Currency) ? "EUR" : config.Currency.Trim().ToUpperInvariant(),
            MovementType = string.IsNullOrWhiteSpace(movementType) ? null : movementType.Trim(),
            MovementTypeLabel = string.IsNullOrWhiteSpace(movementTypeLabel) ? null : movementTypeLabel.Trim(),
            Description = description,
            BalanceAfter = balanceAfter,
            OriginalCsvLine = rawLine.Length > 2000 ? rawLine[..2000] : rawLine,
            ExternalId = externalId,
            Hash = hash,
            DateCreated = now,
            DateUpdated = now,
            CreatedByUser = user,
            CreatedByProcess = "Upload",
            Status = "Imported",
            Tag = string.IsNullOrEmpty(tag) ? null : tag,
        };
    }

    private static string GetValue(Dictionary<string, string> row, string key)
    {
        foreach (var kv in row)
        {
            if (string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase))
                return kv.Value;
        }
        return "";
    }

    /// <summary>Normalize own-account value for matching (BOM/whitespace).</summary>
    private static string NormOwnAccount(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        return s.Trim().Replace("\uFEFF", "", StringComparison.Ordinal);
    }

    /// <summary>Set of normalized keys (Name or AccountNumber) for BalanceSheetAccounts that have a ledger link. Only lines for these accounts are imported.</summary>
    private async Task<HashSet<string>> GetTrackedOwnAccountKeysAsync(CancellationToken ct)
    {
        var list = await _context.BalanceSheetAccounts
            .AsNoTracking()
            .Where(a => a.LedgerAccountId != null)
            .Select(a => new { a.Name, a.AccountNumber })
            .ToListAsync(ct);
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var a in list)
        {
            var nameKey = NormOwnAccount(a.Name);
            if (nameKey.Length > 0) set.Add(nameKey);
            var numKey = NormOwnAccount(a.AccountNumber);
            if (numKey.Length > 0) set.Add(numKey);
        }
        return set;
    }

    private static bool IsOwnAccountTracked(string? ownAccount, HashSet<string> trackedKeys)
    {
        var key = NormOwnAccount(ownAccount);
        return key.Length > 0 && trackedKeys.Contains(key);
    }

    private static string[] ParseCsvLine(string line, string delimiter)
    {
        var list = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (!inQuotes && (delimiter.Length == 1 && c == delimiter[0] || line.Length >= i + delimiter.Length && line.Substring(i, delimiter.Length) == delimiter))
            {
                list.Add(current.ToString());
                current.Clear();
                if (delimiter.Length > 1) i += delimiter.Length - 1;
            }
            else
            {
                current.Append(c);
            }
        }
        list.Add(current.ToString());
        return list.ToArray();
    }

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
