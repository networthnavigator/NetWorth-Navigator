namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>Investment account (brokerage, investment platform). Part of the Assets & Liabilities context.</summary>
public class InvestmentAccount
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
    /// <summary>Optional link to a ledger account (e.g. for double-entry or reporting).</summary>
    public int? LedgerAccountId { get; set; }
    public LedgerAccount? LedgerAccount { get; set; }
}
