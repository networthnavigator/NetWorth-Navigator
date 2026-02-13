namespace NetWorthNavigator.Backend.Models;

/// <summary>Mortgage amortization type.</summary>
public enum AmortizationType
{
    Linear = 0,    // Linear amortization: equal principal payments
    Annuity = 1    // Annuity: equal monthly payments (interest + principal)
}

/// <summary>Mortgage: start value, interest start date, term, current rate, fixed-rate period.</summary>
public class Mortgage
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal StartValue { get; set; }
    public DateTime InterestStartDate { get; set; }
    public int TermYears { get; set; }
    public decimal CurrentInterestRate { get; set; }  // e.g. 4.5 for 4.5%
    public int FixedRatePeriodYears { get; set; }    // remaining years at current rate
    public AmortizationType AmortizationType { get; set; } = AmortizationType.Linear;  // Linear or Annuity
    public bool IsPaidOff { get; set; }              // whether this mortgage part is fully paid off
    public decimal? CurrentValue { get; set; }       // manually entered current value (nullable)
    public decimal ExtraPaidOff { get; set; }        // calculated extra amount paid off beyond normal amortization
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
}
