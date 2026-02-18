namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>
/// A booking (boekingsstuk): double-entry journal entry with debit/credit lines per ledger account.
/// In accounting jargon "booking" = recording in the books. Can be created from a document line + business rules or manually.
/// </summary>
public class Booking
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string Reference { get; set; } = string.Empty;
    /// <summary>Optional: which transaction document line this booking was generated from.</summary>
    public Guid? SourceDocumentLineId { get; set; }
    public DateTime DateCreated { get; set; }
    public string CreatedByUser { get; set; } = string.Empty;
    /// <summary>When true, user should review this booking (e.g. contra came from a rule with RequiresReview).</summary>
    public bool RequiresReview { get; set; } = true;
    /// <summary>When set, the booking has been reviewed/approved by the user.</summary>
    public DateTime? ReviewedAt { get; set; }

    public ICollection<BookingLine> Lines { get; set; } = new List<BookingLine>();
}
