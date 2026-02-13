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
    public string[] ExpectedHeaders { get; set; } = [];
    public ColumnMappingDto[] ColumnMapping { get; set; } = [];
}

public class ColumnMappingDto
{
    public string FileColumn { get; set; } = string.Empty;
    public string DbField { get; set; } = string.Empty;
}
