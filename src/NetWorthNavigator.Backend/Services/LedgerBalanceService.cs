using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Application.Services;
using NetWorthNavigator.Backend.Data;

namespace NetWorthNavigator.Backend.Services;

/// <summary>Computes ledger account balances from booking lines (Debit - Credit per ledger account).</summary>
public sealed class LedgerBalanceService : ILedgerBalanceService
{
    private readonly AppDbContext _db;

    public LedgerBalanceService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyDictionary<int, decimal>> GetBalancesByLedgerAccountIdsAsync(IEnumerable<int> ledgerAccountIds, CancellationToken ct = default)
    {
        var ids = ledgerAccountIds.Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<int, decimal>();

        var balances = await _db.BookingLines
            .Where(l => ids.Contains(l.LedgerAccountId))
            .GroupBy(l => l.LedgerAccountId)
            .Select(g => new { LedgerAccountId = g.Key, Balance = g.Sum(l => l.DebitAmount - l.CreditAmount) })
            .ToDictionaryAsync(x => x.LedgerAccountId, x => x.Balance, ct);

        return balances;
    }
}
