using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Domain.Repositories;

/// <summary>Repository for PropertyValuation. Defined in Domain (DDD).</summary>
public interface IPropertyValuationRepository
{
    Task<IReadOnlyList<PropertyValuation>> GetByPropertyIdAsync(int propertyId, CancellationToken ct = default);
    Task<PropertyValuation?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<PropertyValuation> AddAsync(PropertyValuation entity, CancellationToken ct = default);
    Task UpdateAsync(PropertyValuation entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
