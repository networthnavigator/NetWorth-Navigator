using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

/// <summary>Repository for Mortgage. Defined in Domain (DDD).</summary>
public interface IMortgageRepository
{
    Task<IReadOnlyList<Mortgage>> GetAllAsync(CancellationToken ct = default);
    Task<Mortgage?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Mortgage> AddAsync(Mortgage entity, CancellationToken ct = default);
    Task UpdateAsync(Mortgage entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<int> GetNextSortOrderAsync(CancellationToken ct = default);
}
