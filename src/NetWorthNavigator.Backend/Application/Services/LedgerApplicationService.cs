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
        return list.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<LedgerAccountDto>> GetAssetsAsync(CancellationToken ct = default)
    {
        var list = await _ledger.GetByAssetsCategoryAsync(ct);
        return list.Select(MapToDto).ToList();
    }

    public async Task<LedgerAccountDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _ledger.GetByIdAsync(id, ct);
        return entity == null ? null : MapToDto(entity);
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
        return MapToDto(added);
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
        return updated == null ? null : MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _ledger.GetByIdAsync(id, ct);
        if (entity == null) return false;
        await _ledger.DeleteAsync(id, ct);
        return true;
    }

    private static LedgerAccountDto MapToDto(LedgerAccount l)
    {
        return new LedgerAccountDto
        {
            Id = l.Id,
            AccountStructureId = l.AccountStructureId,
            AccountStructureName = l.AccountStructure?.Name ?? "",
            Code = l.Code,
            Name = l.Name,
            SortOrder = l.SortOrder,
        };
    }
}
