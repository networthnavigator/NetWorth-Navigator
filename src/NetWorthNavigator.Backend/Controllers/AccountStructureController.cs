using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

public class AccountClassOptionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Path { get; set; } = "";
}

[ApiController]
[Route("api/accountstructure")]
public class AccountStructureController : ControllerBase
{
    private readonly AppDbContext _context;

    public AccountStructureController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>GET structure tree, filtered to only branches that have at least one ledger account.</summary>
    [HttpGet("used")]
    public async Task<ActionResult<IEnumerable<AccountStructureTreeDto>>> GetUsedStructure()
    {
        var all = await _context.AccountStructures.AsNoTracking().OrderBy(a => a.SortOrder).ToListAsync();
        var ledgerCounts = await _context.LedgerAccounts
            .GroupBy(l => l.AccountStructureId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count);

        var usedIds = new HashSet<int>();
        foreach (var (id, _) in ledgerCounts)
        {
            usedIds.Add(id);
            var node = all.FirstOrDefault(a => a.Id == id);
            while (node?.ParentId != null)
            {
                usedIds.Add(node.ParentId.Value);
                node = all.FirstOrDefault(a => a.Id == node.ParentId);
            }
        }

        var roots = all.Where(a => a.ParentId == null).Select(a => MapToDto(a)).ToList();
        foreach (var r in roots)
            AttachChildrenFiltered(r, all, usedIds);
        var filtered = roots.Where(r => HasAnyUsed(r, usedIds)).ToList();
        return Ok(filtered);
    }

    /// <summary>GET account classes (level 3) as flat list with full path, for ledger account dropdown.</summary>
    [HttpGet("account-classes")]
    public async Task<ActionResult<IEnumerable<AccountClassOptionDto>>> GetAccountClasses()
    {
        var all = await _context.AccountStructures.AsNoTracking().OrderBy(a => a.SortOrder).ToListAsync();
        var level3 = all.Where(a => a.Level >= 3 && !all.Any(c => c.ParentId == a.Id)).ToList(); // leaf nodes (account classes)
        var result = level3.Select(a =>
        {
            var path = new List<string>();
            var current = a;
            while (current != null)
            {
                path.Insert(0, current.Name);
                current = current.ParentId != null ? all.FirstOrDefault(x => x.Id == current.ParentId) : null;
            }
            return new AccountClassOptionDto { Id = a.Id, Code = a.Code, Name = a.Name, Path = string.Join(" > ", path) };
        }).OrderBy(x => x.Path).ToList();
        return Ok(result);
    }

    /// <summary>GET full structure tree (for display).</summary>
    [HttpGet("full")]
    public async Task<ActionResult<IEnumerable<AccountStructureTreeDto>>> GetFullStructure()
    {
        var all = await _context.AccountStructures.AsNoTracking().OrderBy(a => a.SortOrder).ToListAsync();
        var roots = all.Where(a => a.ParentId == null).Select(a => MapToDto(a)).ToList();
        foreach (var r in roots)
            AttachChildren(r, all);
        return Ok(roots);
    }

    private static bool HasAnyUsed(AccountStructureTreeDto node, HashSet<int> usedIds)
    {
        if (usedIds.Contains(node.Id)) return true;
        return node.Children.Any(c => HasAnyUsed(c, usedIds));
    }

    private static AccountStructureTreeDto MapToDto(AccountStructure a)
    {
        return new AccountStructureTreeDto
        {
            Id = a.Id,
            ParentId = a.ParentId,
            Level = a.Level,
            Code = a.Code,
            Name = a.Name,
            SortOrder = a.SortOrder,
        };
    }

    private static void AttachChildrenFiltered(AccountStructureTreeDto node, List<AccountStructure> all, HashSet<int> usedIds)
    {
        var children = all.Where(a => a.ParentId == node.Id && usedIds.Contains(a.Id)).Select(MapToDto).ToList();
        foreach (var c in children)
            AttachChildrenFiltered(c, all, usedIds);
        node.Children = children;
    }

    private static void AttachChildren(AccountStructureTreeDto node, List<AccountStructure> all)
    {
        node.Children = all.Where(a => a.ParentId == node.Id).Select(MapToDto).ToList();
        foreach (var c in node.Children)
            AttachChildren(c, all);
    }
}
