namespace NetWorthNavigator.Backend.Models;

/// <summary>User's property (home). Value is determined by valuations; purchase value is optional.</summary>
public class Property
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? PurchaseValue { get; set; }  // Optional purchase price
    public DateTime? PurchaseDate { get; set; }  // Optional purchase date
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
}
