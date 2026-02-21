using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Services;

/// <summary>Import/export automated booking rules to a seed JSON file.</summary>
public class BookingRulesSeedService
{
    private readonly AppDbContext _context;

    public BookingRulesSeedService(AppDbContext context) => _context = context;

    /// <summary>Imports user rules from JSON. Skips system rules (MatchField=OwnAccount). Skips a rule if one already exists with same MatchField, MatchValue and LedgerAccountId. Only adds when LedgerAccountId exists.</summary>
    public async Task<BookingRulesSeedResult> ImportFromJsonAsync(string json, CancellationToken ct = default)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var items = JsonSerializer.Deserialize<BookingRuleSeedItem[]>(json, options);
        if (items == null || items.Length == 0)
            return new BookingRulesSeedResult { RulesAdded = 0 };

        int added = 0;
        var existingLedgerIds = await _context.LedgerAccounts.Select(a => a.Id).ToHashSetAsync(ct);
        foreach (var item in items)
        {
            var matchField = (item.MatchField ?? "ContraAccountName").Trim();
            if (string.Equals(matchField, "OwnAccount", StringComparison.OrdinalIgnoreCase))
                continue;
            if (item.LedgerAccountId <= 0 || !existingLedgerIds.Contains(item.LedgerAccountId))
                continue;
            var matchValue = (item.MatchValue ?? "").Trim();
            var exists = await _context.BusinessRules
                .AnyAsync(r => r.MatchField == matchField && r.MatchValue == matchValue && r.LedgerAccountId == item.LedgerAccountId, ct);
            if (exists)
                continue;

            var secondId = item.SecondLedgerAccountId;
            if (secondId.HasValue && (secondId.Value <= 0 || !existingLedgerIds.Contains(secondId.Value)))
                secondId = null;
            _context.BusinessRules.Add(new BusinessRule
            {
                Name = (item.Name ?? "").Trim(),
                MatchField = matchField,
                MatchOperator = string.IsNullOrWhiteSpace(item.MatchOperator) ? "Contains" : item.MatchOperator.Trim(),
                MatchValue = matchValue,
                LedgerAccountId = item.LedgerAccountId,
                SecondLedgerAccountId = secondId,
                SortOrder = item.SortOrder,
                IsActive = item.IsActive,
                RequiresReview = item.RequiresReview,
            });
            added++;
        }

        await _context.SaveChangesAsync(ct);
        return new BookingRulesSeedResult { RulesAdded = added };
    }

    /// <summary>Exports current user-editable booking rules to JSON (for seed file). System-generated rules (e.g. OwnAccount) are excluded.</summary>
    public async Task<string> ExportToJsonAsync(CancellationToken ct = default)
    {
        var list = await _context.BusinessRules
            .Include(r => r.LedgerAccount)
            .Include(r => r.SecondLedgerAccount)
            .Where(r => !r.IsSystemGenerated)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .Select(r => new BookingRuleSeedItem
            {
                Name = r.Name,
                MatchField = r.MatchField,
                MatchOperator = r.MatchOperator,
                MatchValue = r.MatchValue,
                LedgerAccountId = r.LedgerAccountId,
                LedgerAccountCode = r.LedgerAccount != null ? r.LedgerAccount.Code : null,
                LedgerAccountName = r.LedgerAccount != null ? r.LedgerAccount.Name : null,
                SecondLedgerAccountId = r.SecondLedgerAccountId,
                SecondLedgerAccountCode = r.SecondLedgerAccount != null ? r.SecondLedgerAccount.Code : null,
                SecondLedgerAccountName = r.SecondLedgerAccount != null ? r.SecondLedgerAccount.Name : null,
                SortOrder = r.SortOrder,
                IsActive = r.IsActive,
                RequiresReview = r.RequiresReview,
            })
            .ToListAsync(ct);

        var options = new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return JsonSerializer.Serialize(list, options);
    }

    internal sealed class BookingRuleSeedItem
    {
        public string? Name { get; set; }
        public string? MatchField { get; set; }
        public string? MatchOperator { get; set; }
        public string? MatchValue { get; set; }
        public int LedgerAccountId { get; set; }
        public string? LedgerAccountCode { get; set; }
        public string? LedgerAccountName { get; set; }
        public int? SecondLedgerAccountId { get; set; }
        public string? SecondLedgerAccountCode { get; set; }
        public string? SecondLedgerAccountName { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public bool RequiresReview { get; set; } = true;
    }
}

public class BookingRulesSeedResult
{
    public int RulesAdded { get; set; }
}
