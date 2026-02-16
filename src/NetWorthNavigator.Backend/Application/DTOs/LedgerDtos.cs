namespace NetWorthNavigator.Backend.Application.DTOs;

public class LedgerAccountDto
{
    public int Id { get; set; }
    public int AccountStructureId { get; set; }
    public string AccountStructureName { get; set; } = "";
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
}

public class LedgerAccountCreateDto
{
    public int AccountStructureId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
}

public class LedgerAccountUpdateDto
{
    public int? AccountStructureId { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    public int? SortOrder { get; set; }
}
