namespace NetWorthNavigator.Backend.Models;

/// <summary>
/// User-managed ledger account. Linked to an account class (level-3 node) in the fixed structure.
/// </summary>
public class LedgerAccount
{
    public int Id { get; set; }
    public int AccountStructureId { get; set; }
    public AccountStructure? AccountStructure { get; set; }

    public string Code { get; set; } = string.Empty;  // e.g. 1101, 0411
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
