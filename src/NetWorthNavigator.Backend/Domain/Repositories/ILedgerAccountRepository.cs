using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

/// <summary>Repository for LedgerAccount. Defined in Domain (DDD).</summary>
public interface ILedgerAccountRepository
{
    Task<IReadOnlyList<LedgerAccount>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<LedgerAccount>> GetByAssetsCategoryAsync(CancellationToken ct = default);
    Task<LedgerAccount?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<LedgerAccount> AddAsync(LedgerAccount entity, CancellationToken ct = default);
    Task UpdateAsync(LedgerAccount entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
