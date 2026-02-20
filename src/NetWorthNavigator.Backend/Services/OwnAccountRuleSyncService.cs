using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Services;

/// <summary>Ensures a read-only OwnAccount booking rule exists when a balance-sheet account is created or updated with a ledger link. Used so the Automated booking rules page shows the rule immediately without app restart.</summary>
public class OwnAccountRuleSyncService
{
    private readonly AppDbContext _context;

    public OwnAccountRuleSyncService(AppDbContext context) => _context = context;

    /// <summary>If the balance-sheet account has LedgerAccountId and AccountNumber, ensures one OwnAccount BusinessRule exists (adds it if missing). Call after Create or Update of an account.</summary>
    public async Task EnsureRuleForBalanceSheetAccountAsync(int balanceSheetAccountId, CancellationToken ct = default)
    {
        var acc = await _context.BalanceSheetAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == balanceSheetAccountId, ct);
        if (acc == null || !acc.LedgerAccountId.HasValue) return;
        var numberMatch = (acc.AccountNumber ?? "").Trim();
        if (string.IsNullOrEmpty(numberMatch)) return;

        var exists = await _context.BusinessRules
            .AnyAsync(r => r.MatchField == "OwnAccount" && r.MatchValue == numberMatch && r.LedgerAccountId == acc.LedgerAccountId, ct);
        if (exists) return;

        _context.BusinessRules.Add(new BusinessRule
        {
            Name = acc.Name ?? numberMatch,
            MatchField = "OwnAccount",
            MatchOperator = "Equals",
            MatchValue = numberMatch,
            LedgerAccountId = acc.LedgerAccountId.Value,
            SortOrder = 0,
            IsActive = true,
            RequiresReview = false,
            IsSystemGenerated = true,
        });
        await _context.SaveChangesAsync(ct);
    }
}
