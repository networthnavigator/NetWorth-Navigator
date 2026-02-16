namespace NetWorthNavigator.Backend.Application.DTOs;

public class BalanceSheetAccountDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "EUR";
    public int SortOrder { get; set; }
    public int? LedgerAccountId { get; set; }
    public string? LedgerAccountName { get; set; }
}

public class BalanceSheetAccountCreateUpdateDto
{
    public string? Name { get; set; }
    public decimal? CurrentBalance { get; set; }
    public string? Currency { get; set; }
    public int? LedgerAccountId { get; set; }
}
