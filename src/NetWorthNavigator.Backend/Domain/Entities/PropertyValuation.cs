namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>Property valuation at a specific date. Part of the Assets & Liabilities context.</summary>
public class PropertyValuation
{
    public int Id { get; set; }
    public int PropertyId { get; set; }
    public Property? Property { get; set; }
    public DateTime ValuationDate { get; set; }
    public decimal Value { get; set; }
    public int SortOrder { get; set; }
}
