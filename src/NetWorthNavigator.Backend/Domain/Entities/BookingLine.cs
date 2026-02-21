namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>
/// One line of a booking: debit or credit on a ledger account.
/// </summary>
public class BookingLine
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Booking? Booking { get; set; }
    public int LineNumber { get; set; }
    public int LedgerAccountId { get; set; }
    public LedgerAccount? LedgerAccount { get; set; }
    /// <summary>Debit amount (positive).</summary>
    public decimal DebitAmount { get; set; }
    /// <summary>Credit amount (positive).</summary>
    public decimal CreditAmount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? Description { get; set; }
    /// <summary>When true, this line must be approved by the user. Line 1 (own account) is always false.</summary>
    public bool RequiresReview { get; set; }
    /// <summary>When set, the line has been approved by the user.</summary>
    public DateTime? ReviewedAt { get; set; }
    /// <summary>When set, this line was created by the given business rule. Null for own-account (line 1) and manually added lines.</summary>
    public int? BusinessRuleId { get; set; }
}
