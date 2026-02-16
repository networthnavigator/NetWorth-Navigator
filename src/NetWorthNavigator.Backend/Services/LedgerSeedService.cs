using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Services;

public class LedgerSeedService
{
    private readonly AppDbContext _context;

    public LedgerSeedService(AppDbContext context) => _context = context;

    /// <summary>Imports ledger accounts from JSON. Each entry references structure by accountStructureCode (leaf code). Only runs when ledger is empty.</summary>
    public async Task<int> ImportFromJsonAsync(string json)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var items = JsonSerializer.Deserialize<LedgerSeedItem[]>(json, options)
            ?? throw new ArgumentException("Invalid JSON: expected array of ledger items.");

        var structures = await _context.AccountStructures.AsNoTracking().ToListAsync();
        var leafByCode = structures
            .Where(a => !structures.Any(c => c.ParentId == a.Id))
            .ToDictionary(a => a.Code, a => a.Id);

        int count = 0;
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.AccountStructureCode))
                continue;
            if (!leafByCode.TryGetValue(item.AccountStructureCode.Trim(), out var structureId))
                continue;

            var exists = await _context.LedgerAccounts
                .AnyAsync(l => l.AccountStructureId == structureId && l.Code == (item.Code ?? "").Trim());
            if (exists)
                continue;

            _context.LedgerAccounts.Add(new LedgerAccount
            {
                AccountStructureId = structureId,
                Code = (item.Code ?? "").Trim(),
                Name = (item.Name ?? "").Trim(),
                SortOrder = item.SortOrder,
            });
            count++;
        }

        await _context.SaveChangesAsync();
        return count;
    }

    /// <summary>Exports current ledger accounts to JSON seed format (array of AccountStructureCode, Code, Name, SortOrder).</summary>
    public async Task<string> ExportToJsonAsync()
    {
        var accounts = await _context.LedgerAccounts
            .Include(l => l.AccountStructure)
            .OrderBy(l => l.AccountStructure != null ? l.AccountStructure.Code : "")
            .ThenBy(l => l.SortOrder)
            .ThenBy(l => l.Code)
            .ToListAsync();
        var list = accounts.Select(l => new LedgerSeedItem
        {
            AccountStructureCode = l.AccountStructure?.Code ?? "",
            Code = l.Code,
            Name = l.Name,
            SortOrder = l.SortOrder,
        }).ToList();
        return JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    private sealed class LedgerSeedItem
    {
        public string? AccountStructureCode { get; set; }
        public string? Code { get; set; }
        public string? Name { get; set; }
        public int SortOrder { get; set; }
    }
}
