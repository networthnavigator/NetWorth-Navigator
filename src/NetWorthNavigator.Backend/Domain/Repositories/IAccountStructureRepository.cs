using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

/// <summary>Repository for AccountStructure (chart of accounts tree). Defined in Domain (DDD).</summary>
public interface IAccountStructureRepository
{
    Task<IReadOnlyList<AccountStructure>> GetAllOrderedAsync(CancellationToken ct = default);
    Task<AccountStructure?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<AccountStructure>> GetLeafNodesAsync(CancellationToken ct = default);
}
