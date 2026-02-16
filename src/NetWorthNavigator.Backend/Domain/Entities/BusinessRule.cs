namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>
/// PoC: Rule to auto-suggest or create a booking line based on imported line content.
/// E.g. "When counterparty name contains 'Albert Heijn' → ledger account 'Boodschappen'."
/// </summary>
public class BusinessRule
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>Condition: e.g. "ContraAccountName", "Description".</summary>
    public string MatchField { get; set; } = "ContraAccountName";
    /// <summary>Operator: "Contains", "Equals", "StartsWith".</summary>
    public string MatchOperator { get; set; } = "Contains";
    /// <summary>Value to match (e.g. "Albert Heijn").</summary>
    public string MatchValue { get; set; } = string.Empty;
    /// <summary>Ledger account to use for the contra booking.</summary>
    public int LedgerAccountId { get; set; }
    public LedgerAccount? LedgerAccount { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
