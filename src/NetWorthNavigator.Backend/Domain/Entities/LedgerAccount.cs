namespace NetWorthNavigator.Backend.Domain.Entities;

/// <summary>User-managed ledger account. Linked to an account class in the fixed structure.</summary>
public class LedgerAccount
{
    public int Id { get; set; }
    public int AccountStructureId { get; set; }
    public AccountStructure? AccountStructure { get; set; }

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
