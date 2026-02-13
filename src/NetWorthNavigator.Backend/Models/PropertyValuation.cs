namespace NetWorthNavigator.Backend.Models;

/// <summary>Property valuation at a specific date.</summary>
public class PropertyValuation
{
    public int Id { get; set; }
    public int PropertyId { get; set; }
    public Property? Property { get; set; }
    public DateTime ValuationDate { get; set; }
    public decimal Value { get; set; }
    public int SortOrder { get; set; }
}
