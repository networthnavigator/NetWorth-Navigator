namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>User's balance-sheet account (bank, cash). Optionally linked to a ledger account.</summary>
public class BalanceSheetAccount
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
    public int? LedgerAccountId { get; set; }
    public LedgerAccount? LedgerAccount { get; set; }
}
