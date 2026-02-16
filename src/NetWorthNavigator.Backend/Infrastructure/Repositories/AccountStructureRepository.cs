using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Domain.Repositories;

namespace NetWorthNavigator.Backend.Infrastructure.Repositories;

public sealed class AccountStructureRepository : IAccountStructureRepository
{
    private readonly AppDbContext _db;

    public AccountStructureRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<AccountStructure>> GetAllOrderedAsync(CancellationToken ct = default)
    {
        return await _db.AccountStructures.AsNoTracking().OrderBy(a => a.SortOrder).ToListAsync(ct);
    }

    public async Task<AccountStructure?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.AccountStructures.FindAsync([id], ct);
    }

    public async Task<IReadOnlyList<AccountStructure>> GetLeafNodesAsync(CancellationToken ct = default)
    {
        var all = await _db.AccountStructures.AsNoTracking().ToListAsync(ct);
        return all.Where(a => a.Level >= 3 && !all.Any(c => c.ParentId == a.Id)).ToList();
    }
}
