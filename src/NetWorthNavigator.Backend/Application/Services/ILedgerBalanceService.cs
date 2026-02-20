namespace NetWorthNavigator.Backend.Application.Services;

/// <summary>Provides ledger account balances from booked lines (sum of Debit - Credit per ledger account).</summary>
public interface ILedgerBalanceService
{
    /// <summary>Returns balance per ledger account id. Balance = sum(DebitAmount - CreditAmount) over all booking lines for that account.</summary>
    Task<IReadOnlyDictionary<int, decimal>> GetBalancesByLedgerAccountIdsAsync(IEnumerable<int> ledgerAccountIds, CancellationToken ct = default);
}
