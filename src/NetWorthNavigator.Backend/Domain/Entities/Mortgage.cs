namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>Mortgage amortization type (value object / enum).</summary>
public enum AmortizationType
{
    Linear = 0,
    Annuity = 1
}

/// <summary>Mortgage: start value, interest, term. Part of the Assets & Liabilities context.</summary>
public class Mortgage
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal StartValue { get; set; }
    public DateTime InterestStartDate { get; set; }
    public int TermYears { get; set; }
    public decimal CurrentInterestRate { get; set; }
    public int FixedRatePeriodYears { get; set; }
    public AmortizationType AmortizationType { get; set; } = AmortizationType.Linear;
    public bool IsPaidOff { get; set; }
    public decimal? CurrentValue { get; set; }
    public decimal ExtraPaidOff { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
}
