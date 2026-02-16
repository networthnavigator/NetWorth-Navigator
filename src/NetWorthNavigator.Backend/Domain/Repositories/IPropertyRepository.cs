using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

public interface IPropertyRepository
{
    Task<IReadOnlyList<Property>> GetAllAsync(CancellationToken ct = default);
    Task<Property?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Property> AddAsync(Property entity, CancellationToken ct = default);
    Task UpdateAsync(Property entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<int> GetNextSortOrderAsync(CancellationToken ct = default);
}
