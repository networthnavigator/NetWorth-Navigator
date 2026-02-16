using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Domain.Repositories;

namespace NetWorthNavigator.Backend.Infrastructure.Repositories;

/// <summary>Infrastructure: EF implementation of IBalanceSheetAccountRepository. Clean Architecture: Infrastructure layer.</summary>
public sealed class BalanceSheetAccountRepository : IBalanceSheetAccountRepository
{
    private readonly AppDbContext _db;

    public BalanceSheetAccountRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<BalanceSheetAccount>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.BalanceSheetAccounts
            .Include(a => a.LedgerAccount)
            .AsNoTracking()
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .ToListAsync(ct);
    }

    public async Task<BalanceSheetAccount?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.BalanceSheetAccounts
            .Include(a => a.LedgerAccount)
            .FirstOrDefaultAsync(a => a.Id == id, ct);
    }

    public async Task<BalanceSheetAccount> AddAsync(BalanceSheetAccount entity, CancellationToken ct = default)
    {
        _db.BalanceSheetAccounts.Add(entity);
        await _db.SaveChangesAsync(ct);
        await _db.Entry(entity).Reference(e => e.LedgerAccount).LoadAsync(ct);
        return entity;
    }

    public async Task UpdateAsync(BalanceSheetAccount entity, CancellationToken ct = default)
    {
        _db.BalanceSheetAccounts.Update(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var e = await _db.BalanceSheetAccounts.FindAsync([id], ct);
        if (e != null)
        {
            _db.BalanceSheetAccounts.Remove(e);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<int> GetNextSortOrderAsync(CancellationToken ct = default)
    {
        var max = await _db.BalanceSheetAccounts.Select(a => (int?)a.SortOrder).MaxAsync(ct);
        return (max ?? 0) + 1;
    }
}
