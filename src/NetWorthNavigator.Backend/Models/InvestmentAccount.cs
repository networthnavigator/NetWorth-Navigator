namespace NetWorthNavigator.Backend.Models;

/// <summary>Investment account (brokerage, investment platform) with current balance/value.</summary>
public class InvestmentAccount
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
}
