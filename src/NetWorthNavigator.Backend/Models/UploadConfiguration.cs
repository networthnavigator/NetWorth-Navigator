namespace NetWorthNavigator.Backend.Models;

public class BankDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
}

public class UploadConfigurationDto
{
    public string Id { get; set; } = string.Empty;
    public string BankId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Delimiter { get; set; } = ";";
    public string Currency { get; set; } = "EUR";
    public string[] ExpectedHeaders { get; set; } = [];
    public ColumnMappingDto[] ColumnMapping { get; set; } = [];
    /// <summary>File column names (in order) that form the deduplication key. If one column, its value is used as ExternalId; if multiple, their concatenation is hashed.</summary>
    public string[]? HashFileColumns { get; set; }
}

public class ColumnMappingDto
{
    public string FileColumn { get; set; } = string.Empty;
    public string DbField { get; set; } = string.Empty;
}

/// <summary>API response shape for one transaction document line (header/line model).</summary>
public class TransactionLineDto
{
    public Guid Id { get; set; }
    public Guid? DocumentId { get; set; }
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
    public string? SourceName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? UserComments { get; set; }
    public string? Tag { get; set; }
}

/// <summary>One line in the upload preview report (before import).</summary>
public class UploadPreviewLineDto
{
    public string? Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    /// <summary>"import" = will be imported, "skip" = duplicate, invalid, or account not tracked</summary>
    public string Action { get; set; } = "import";
    /// <summary>Optional reason when Action is "skip", e.g. "Account not tracked", "Duplicate"</summary>
    public string? ActionReason { get; set; }
}
