namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>Fixed chart of accounts structure. Level 1=Category, 2=Subcategory, 3=Account class.</summary>
public class AccountStructure
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public AccountStructure? Parent { get; set; }
    public ICollection<AccountStructure> Children { get; set; } = new List<AccountStructure>();
    public ICollection<LedgerAccount> LedgerAccounts { get; set; } = new List<LedgerAccount>();

    public int Level { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
