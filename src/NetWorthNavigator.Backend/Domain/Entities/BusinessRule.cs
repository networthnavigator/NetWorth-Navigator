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
    /// <summary>Value to match (e.g. "Albert Heijn"). When CriteriaJson is set, this is the first criterion's value (backward compat).</summary>
    public string MatchValue { get; set; } = string.Empty;
    /// <summary>Optional JSON array of criteria: [{"matchField","matchOperator","matchValue"}]. When set, rule matches when ALL criteria match. Empty/null = use MatchField/MatchOperator/MatchValue only.</summary>
    public string? CriteriaJson { get; set; }
    /// <summary>Ledger account to use for the contra booking (or first of two when SecondLedgerAccountId is set).</summary>
    public int LedgerAccountId { get; set; }
    public LedgerAccount? LedgerAccount { get; set; }
    /// <summary>Optional second ledger for contra (e.g. mortgage: 4001 + 0773). When set, two contra lines are created with amount 0 for user to fill.</summary>
    public int? SecondLedgerAccountId { get; set; }
    public LedgerAccount? SecondLedgerAccount { get; set; }
    /// <summary>Optional JSON array of line items: [{"ledgerAccountId":123,"amountType":"OppositeOfLine1|Zero"}]. When set, used instead of LedgerAccountId+SecondLedgerAccountId. Order preserved.</summary>
    public string? LineItemsJson { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>If true, bookings created with this rule should be reviewed by the user before considered approved. Default true for contra rules; OwnAccount (line 1) does not use rules.</summary>
    public bool RequiresReview { get; set; } = true;
    /// <summary>When true, this rule was created automatically (e.g. OwnAccount per balance-sheet account) and cannot be edited or deleted. Excluded from conflict detection.</summary>
    public bool IsSystemGenerated { get; set; }
}
