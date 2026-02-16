namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>
/// One line of a transaction document (one movement/transaction). From import or manual entry.
/// </summary>
public class TransactionDocumentLine
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public TransactionDocument? Document { get; set; }
    public int LineNumber { get; set; }

    public DateTime Date { get; set; }
    public string OwnAccount { get; set; } = string.Empty;
    public string ContraAccount { get; set; } = string.Empty;
    public string? ContraAccountName { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? MovementType { get; set; }
    public string? MovementTypeLabel { get; set; }
    public string? Description { get; set; }
    public decimal? BalanceAfter { get; set; }
    public string? OriginalCsvLine { get; set; }
    public string? ExternalId { get; set; }
    public string Hash { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public string CreatedByUser { get; set; } = string.Empty;
    public string CreatedByProcess { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? UserComments { get; set; }
    public string? Tag { get; set; }
}
