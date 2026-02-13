using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
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

    private sealed class LedgerSeedItem
    {
        public string? AccountStructureCode { get; set; }
        public string? Code { get; set; }
        public string? Name { get; set; }
        public int SortOrder { get; set; }
    }
}
