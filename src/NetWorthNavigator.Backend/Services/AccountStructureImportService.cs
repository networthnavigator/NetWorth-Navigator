using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Services;

public class AccountStructureImportService
{
    private readonly AppDbContext _context;

    public AccountStructureImportService(AppDbContext context) => _context = context;

    /// <summary>Imports fixed structure (levels 1-3) from JSON. Clears and re-seeds when empty.</summary>
    public async Task<int> ImportStructureAsync(string json)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var roots = JsonSerializer.Deserialize<JsonSeedNode[]>(json, options)
            ?? throw new ArgumentException("Invalid JSON: expected array of nodes.");

        await _context.LedgerAccounts.ExecuteDeleteAsync();
        for (var level = 3; level >= 1; level--)
            await _context.AccountStructures.Where(a => a.Level == level).ExecuteDeleteAsync();

        var sortOrder = new SortOrderHolder { Value = 0 };
        await AddNodesRecursiveAsync(null, roots, 1, sortOrder);
        await _context.SaveChangesAsync();
        return await _context.AccountStructures.CountAsync();
    }

    private async Task AddNodesRecursiveAsync(int? parentId, JsonSeedNode[] nodes, int level, SortOrderHolder sortOrder)
    {
        foreach (var node in nodes)
        {
            var entity = new AccountStructure
            {
                Level = level,
                Code = node.Code ?? "",
                Name = node.Name ?? "",
                ParentId = parentId,
                SortOrder = sortOrder.Value++,
            };
            _context.AccountStructures.Add(entity);
            await _context.SaveChangesAsync();

            if (node.Children is { Length: > 0 })
                await AddNodesRecursiveAsync(entity.Id, node.Children, level + 1, sortOrder);
        }
    }

    private sealed class SortOrderHolder { public int Value; }

    private sealed class JsonSeedNode
    {
        public string? Code { get; set; }
        public string? Name { get; set; }
        public JsonSeedNode[]? Children { get; set; }
    }
}
