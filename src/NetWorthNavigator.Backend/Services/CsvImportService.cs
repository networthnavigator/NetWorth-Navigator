using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Services;

public class CsvImportService
{
    private readonly AppDbContext _context;
    private static readonly object _customConfigLock = new();
    private static List<UploadConfigurationDto>? _customConfigs;

    public CsvImportService(AppDbContext context) => _context = context;

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

    private static IEnumerable<UploadConfigurationDto> AllConfigurations =>
        BuiltInConfigurations.Concat(GetCustomConfigurations());

    public static IReadOnlyList<UploadConfigurationDto> BuiltInConfigurations { get; } =
    [
        new UploadConfigurationDto
        {
            Id = "ing-betaalrekening-csv",
            BankId = "ing",
            Name = "Betaalrekening – puntkommagescheiden CSV met saldo",
            Description = "Export van ING internetbankieren: Betaalrekening, puntkommagescheiden CSV met saldo",
            Delimiter = ";",
            ExpectedHeaders =
            [
                "Datum", "Naam / Omschrijving", "Rekening", "Tegenrekening", "Code", "Af Bij",
                "Bedrag (EUR)", "Mutatiesoort", "Mededelingen", "Saldo na mutatie", "Tag"
            ],
            ColumnMapping =
            [
                new ColumnMappingDto { FileColumn = "Datum", DbField = "Date" },
                new ColumnMappingDto { FileColumn = "Naam / Omschrijving", DbField = "Description" },
                new ColumnMappingDto { FileColumn = "Rekening", DbField = "OwnAccount" },
                new ColumnMappingDto { FileColumn = "Tegenrekening", DbField = "ContraAccount" },
                new ColumnMappingDto { FileColumn = "Bedrag (EUR)", DbField = "Amount" },
                new ColumnMappingDto { FileColumn = "Af Bij", DbField = "_AmountSign" },
                new ColumnMappingDto { FileColumn = "Saldo na mutatie", DbField = "BalanceAfter" },
            ],
        },
    ];

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

    public async Task<(int Imported, int Skipped)> ImportAsync(
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
            return (0, 0);

        var headers = ParseCsvLine(headerLine, config.Delimiter);
        var colIndex = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < headers.Length; i++)
            colIndex[headers[i].Trim().Trim('"')] = i;

        var imported = 0;
        var skipped = 0;
        var now = DateTime.UtcNow;
        var user = "User";
        var hashList = await _context.BankTransactionsHeaders
            .Select(h => h.Hash)
            .ToListAsync(ct);
        var existingHashes = new HashSet<string>(hashList);

        while (reader.ReadLine() is { } line)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var values = ParseCsvLine(line, config.Delimiter);
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Length && i < values.Length; i++)
                row[headers[i].Trim().Trim('"')] = values[i].Trim().Trim('"');

            try
            {
                var header = MapToBankTransactionsHeader(config, row, fileName, now, user, line);
                if (header == null) { skipped++; continue; }

                if (existingHashes.Contains(header.Hash)) { skipped++; continue; }

                _context.BankTransactionsHeaders.Add(header);
                existingHashes.Add(header.Hash);
                imported++;
            }
            catch
            {
                skipped++;
            }
        }

        await _context.SaveChangesAsync(ct);
        return (imported, skipped);
    }

    private static string GetMappedValue(Dictionary<string, string> row, UploadConfigurationDto config, string dbField)
    {
        var mapping = config.ColumnMapping?.FirstOrDefault(m =>
            string.Equals(m.DbField, dbField, StringComparison.OrdinalIgnoreCase));
        return mapping != null ? GetValue(row, mapping.FileColumn) ?? "" : "";
    }

    private static BankTransactionsHeader? MapToBankTransactionsHeader(
        UploadConfigurationDto config,
        Dictionary<string, string> row,
        string fileName,
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
        var description = GetMappedValue(row, config, "Description");
        var tag = GetMappedValue(row, config, "Tag");
        var balanceStr = GetMappedValue(row, config, "BalanceAfter");
        decimal? balanceAfter = null;
        if (!string.IsNullOrEmpty(balanceStr) &&
            decimal.TryParse(balanceStr.Replace(",", "."), NumberStyles.Any, CultureInfo.InvariantCulture, out var b))
            balanceAfter = b;

        var hash = ComputeHash($"{date:yyyy-MM-dd}|{ownAccount}|{contraAccount}|{amount}|{balanceAfter}");

        return new BankTransactionsHeader
        {
            Id = Guid.NewGuid(),
            Date = date,
            OwnAccount = ownAccount,
            ContraAccount = contraAccount,
            Amount = amount,
            Currency = "EUR",
            Description = description,
            BalanceAfter = balanceAfter,
            OriginalCsvLine = rawLine.Length > 2000 ? rawLine[..2000] : rawLine,
            Hash = hash,
            DateCreated = now,
            DateUpdated = now,
            CreatedByUser = user,
            CreatedByProcess = "Upload",
            SourceName = fileName,
            Status = "Imported",
            Year = date.Year,
            Period = $"{date:yyyy-MM}",
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
