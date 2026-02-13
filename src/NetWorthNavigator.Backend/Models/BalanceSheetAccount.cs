namespace NetWorthNavigator.Backend.Models;

/// <summary>User's account (bank, cash) with current balance.</summary>
public class BalanceSheetAccount
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
}
