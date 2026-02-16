namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>User's property (e.g. home). Part of the Assets & Liabilities context.</summary>
public class Property
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? PurchaseValue { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
}
