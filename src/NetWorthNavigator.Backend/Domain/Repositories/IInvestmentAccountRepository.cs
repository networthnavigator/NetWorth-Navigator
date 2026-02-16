using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

public interface IInvestmentAccountRepository
{
    Task<IReadOnlyList<InvestmentAccount>> GetAllAsync(CancellationToken ct = default);
    Task<InvestmentAccount?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<InvestmentAccount> AddAsync(InvestmentAccount entity, CancellationToken ct = default);
    Task UpdateAsync(InvestmentAccount entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<int> GetNextSortOrderAsync(CancellationToken ct = default);
}
