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
}
