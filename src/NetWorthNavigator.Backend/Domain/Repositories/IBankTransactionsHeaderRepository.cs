using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

/// <summary>Repository for BankTransactionsHeader. Defined in Domain (DDD).</summary>
public interface IBankTransactionsHeaderRepository
{
    Task<IReadOnlyList<BankTransactionsHeader>> GetAllAsync(CancellationToken ct = default);
    Task<BankTransactionsHeader?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<BankTransactionsHeader> AddAsync(BankTransactionsHeader entity, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<BankTransactionsHeader> entities, CancellationToken ct = default);
    Task UpdateAsync(BankTransactionsHeader entity, CancellationToken ct = default);
    Task<int> DeleteAllAsync(CancellationToken ct = default);
    Task<bool> ExistsByHashAsync(string hash, CancellationToken ct = default);
    Task<bool> ExistsByExternalIdAsync(string externalId, CancellationToken ct = default);
}
