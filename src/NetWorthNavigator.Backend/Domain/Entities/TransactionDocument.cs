namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>
/// Header of a transaction document: one per upload (file) or per manual batch.
/// Source can be import (bank, credit card, brokerage, crypto) or manual (e.g. cash).
/// </summary>
public class TransactionDocument
{
    public Guid Id { get; set; }
    /// <summary>E.g. Bank, CreditCard, Brokerage, Crypto, Manual.</summary>
    public string SourceType { get; set; } = "Bank";
    /// <summary>Filename, description, or e.g. Cash payments 2025-01.</summary>
    public string SourceName { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public string CreatedByUser { get; set; } = string.Empty;
    public string CreatedByProcess { get; set; } = string.Empty;
    public string? ConfigurationId { get; set; }
    public string Status { get; set; } = "Imported";

    public ICollection<TransactionDocumentLine> Lines { get; set; } = new List<TransactionDocumentLine>();
}
