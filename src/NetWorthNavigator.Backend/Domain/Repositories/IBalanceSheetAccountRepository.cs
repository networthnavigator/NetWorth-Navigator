using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

public interface IBalanceSheetAccountRepository
{
    Task<IReadOnlyList<BalanceSheetAccount>> GetAllAsync(CancellationToken ct = default);
    Task<BalanceSheetAccount?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<BalanceSheetAccount> AddAsync(BalanceSheetAccount entity, CancellationToken ct = default);
    Task UpdateAsync(BalanceSheetAccount entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<int> GetNextSortOrderAsync(CancellationToken ct = default);
}
