namespace NetWorthNavigator.Backend.Models;

public class BankTransactionsHeader
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string OwnAccount { get; set; } = string.Empty;
    public string ContraAccount { get; set; } = string.Empty;
    public decimal Amount { get; set; }  // positive = credit, negative = debit
    public string Currency { get; set; } = "EUR";
    public string? Description { get; set; }
    public decimal? BalanceAfter { get; set; }
    public string? OriginalCsvLine { get; set; }
    public string Hash { get; set; } = string.Empty;  // for deduplication
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public string CreatedByUser { get; set; } = string.Empty;
    public string CreatedByProcess { get; set; } = string.Empty;  // e.g. "Upload" or "Manual"
    public string? SourceName { get; set; }  // filename of source CSV
    public string Status { get; set; } = string.Empty;
    public int Year { get; set; }  // derived from Date
    public string Period { get; set; } = string.Empty;  // format: yyyy-MM
    public string? UserComments { get; set; }
    public string? Tag { get; set; }
}
