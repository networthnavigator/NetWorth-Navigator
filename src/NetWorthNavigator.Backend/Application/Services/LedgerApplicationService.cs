using NetWorthNavigator.Backend.Application.DTOs;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Domain.Repositories;

namespace NetWorthNavigator.Backend.Application.Services;

public sealed class LedgerApplicationService : ILedgerApplicationService
{
    private readonly ILedgerAccountRepository _ledger;
    private readonly IAccountStructureRepository _structure;

    public LedgerApplicationService(ILedgerAccountRepository ledger, IAccountStructureRepository structure)
    {
        _ledger = ledger;
        _structure = structure;
    }

    public async Task<IReadOnlyList<LedgerAccountDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await _ledger.GetAllAsync(ct);
        var pathByStructureId = await GetStructurePathLookupAsync(ct);
        return list.Select(l => MapToDto(l, pathByStructureId)).ToList();
    }

    public async Task<IReadOnlyList<LedgerAccountDto>> GetAssetsAsync(CancellationToken ct = default)
    {
        var list = await _ledger.GetByAssetsCategoryAsync(ct);
        var pathByStructureId = await GetStructurePathLookupAsync(ct);
        return list.Select(l => MapToDto(l, pathByStructureId)).ToList();
    }

    public async Task<LedgerAccountDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _ledger.GetByIdAsync(id, ct);
        if (entity == null) return null;
        var pathByStructureId = await GetStructurePathLookupAsync(ct);
        return MapToDto(entity, pathByStructureId);
    }

    public async Task<LedgerAccountDto> CreateAsync(LedgerAccountCreateDto dto, CancellationToken ct = default)
    {
        var structure = await _structure.GetByIdAsync(dto.AccountStructureId, ct);
        if (structure == null)
            throw new ArgumentException("Invalid account structure id.");
        if (structure.Level < 3)
            throw new ArgumentException("Account structure must be an account class (level 3 or deeper).");

        var all = await _ledger.GetAllAsync(ct);
        var maxSort = all.Where(l => l.AccountStructureId == dto.AccountStructureId).Select(l => l.SortOrder).DefaultIfEmpty(0).Max();
        var entity = new LedgerAccount
        {
            AccountStructureId = dto.AccountStructureId,
            Code = dto.Code.Trim(),
            Name = dto.Name.Trim(),
            SortOrder = maxSort + 1,
        };
        var added = await _ledger.AddAsync(entity, ct);
        var pathByStructureId = await GetStructurePathLookupAsync(ct);
        return MapToDto(added, pathByStructureId);
    }

    public async Task<LedgerAccountDto?> UpdateAsync(int id, LedgerAccountUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _ledger.GetByIdAsync(id, ct);
        if (entity == null) return null;

        if (dto.AccountStructureId.HasValue)
        {
            var structure = await _structure.GetByIdAsync(dto.AccountStructureId.Value, ct);
            if (structure == null || structure.Level < 3)
                throw new ArgumentException("Invalid account structure id.");
            entity.AccountStructureId = dto.AccountStructureId.Value;
        }
        if (dto.Code != null) entity.Code = dto.Code.Trim();
        if (dto.Name != null) entity.Name = dto.Name.Trim();
        if (dto.SortOrder.HasValue) entity.SortOrder = dto.SortOrder.Value;

        await _ledger.UpdateAsync(entity, ct);
        var updated = await _ledger.GetByIdAsync(id, ct);
        if (updated == null) return null;
        var pathByStructureId = await GetStructurePathLookupAsync(ct);
        return MapToDto(updated, pathByStructureId);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _ledger.GetByIdAsync(id, ct);
        if (entity == null) return false;
        await _ledger.DeleteAsync(id, ct);
        return true;
    }

    /// <summary>Builds structure id -> full path (e.g. "Activa > Verzekeringen > Autoverzekering").</summary>
    private async Task<IReadOnlyDictionary<int, string>> GetStructurePathLookupAsync(CancellationToken ct)
    {
        var all = await _structure.GetAllOrderedAsync(ct);
        var byId = all.ToDictionary(a => a.Id);
        var result = new Dictionary<int, string>();
        foreach (var a in all)
        {
            var path = new List<string>();
            var current = a;
            while (current != null)
            {
                path.Insert(0, current.Name);
                current = current.ParentId != null && byId.TryGetValue(current.ParentId.Value, out var parent) ? parent : null;
            }
            result[a.Id] = string.Join(" > ", path);
        }
        return result;
    }

    private static LedgerAccountDto MapToDto(LedgerAccount l, IReadOnlyDictionary<int, string> pathByStructureId)
    {
        var path = pathByStructureId.TryGetValue(l.AccountStructureId, out var p) ? p : "";
        return new LedgerAccountDto
        {
            Id = l.Id,
            AccountStructureId = l.AccountStructureId,
            AccountStructureName = l.AccountStructure?.Name ?? "",
            AccountStructurePath = path,
            Code = l.Code,
            Name = l.Name,
            SortOrder = l.SortOrder,
        };
    }
}
