namespace NetWorthNavigator.Backend.Models;

public class AccountStructureTreeDto
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public int Level { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<AccountStructureTreeDto> Children { get; set; } = new();
}
