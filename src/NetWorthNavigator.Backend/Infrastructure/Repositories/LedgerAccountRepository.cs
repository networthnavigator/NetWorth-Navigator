using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Domain.Repositories;

namespace NetWorthNavigator.Backend.Infrastructure.Repositories;

public sealed class LedgerAccountRepository : ILedgerAccountRepository
{
    private readonly AppDbContext _db;

    public LedgerAccountRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<LedgerAccount>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.LedgerAccounts
            .Include(l => l.AccountStructure)
            .AsNoTracking()
            .OrderBy(l => l.AccountStructure!.SortOrder)
            .ThenBy(l => l.SortOrder)
            .ThenBy(l => l.Code)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LedgerAccount>> GetByAssetsCategoryAsync(CancellationToken ct = default)
    {
        var all = await _db.AccountStructures.AsNoTracking().ToListAsync(ct);
        var assetsRoot = all.FirstOrDefault(a => a.ParentId == null && a.Code == "1");
        if (assetsRoot == null) return Array.Empty<LedgerAccount>();
        var underAssets = new HashSet<int>();
        void Collect(int id)
        {
            underAssets.Add(id);
            foreach (var c in all.Where(a => a.ParentId == id))
                Collect(c.Id);
        }
        Collect(assetsRoot.Id);
        return await _db.LedgerAccounts
            .Include(l => l.AccountStructure)
            .AsNoTracking()
            .Where(l => underAssets.Contains(l.AccountStructureId))
            .OrderBy(l => l.AccountStructure!.SortOrder)
            .ThenBy(l => l.SortOrder)
            .ThenBy(l => l.Code)
            .ToListAsync(ct);
    }

    public async Task<LedgerAccount?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.LedgerAccounts.Include(l => l.AccountStructure).FirstOrDefaultAsync(l => l.Id == id, ct);
    }

    public async Task<LedgerAccount> AddAsync(LedgerAccount entity, CancellationToken ct = default)
    {
        _db.LedgerAccounts.Add(entity);
        await _db.SaveChangesAsync(ct);
        await _db.Entry(entity).Reference(e => e.AccountStructure).LoadAsync(ct);
        return entity;
    }

    public async Task UpdateAsync(LedgerAccount entity, CancellationToken ct = default)
    {
        _db.LedgerAccounts.Update(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var e = await _db.LedgerAccounts.FindAsync([id], ct);
        if (e != null)
        {
            _db.LedgerAccounts.Remove(e);
            await _db.SaveChangesAsync(ct);
        }
    }
}
