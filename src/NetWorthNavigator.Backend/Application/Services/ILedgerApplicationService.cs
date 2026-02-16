using NetWorthNavigator.Backend.Application.DTOs;

namespace NetWorthNavigator.Backend.Application.Services;

public interface ILedgerApplicationService
{
    Task<IReadOnlyList<LedgerAccountDto>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<LedgerAccountDto>> GetAssetsAsync(CancellationToken ct = default);
    Task<LedgerAccountDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<LedgerAccountDto> CreateAsync(LedgerAccountCreateDto dto, CancellationToken ct = default);
    Task<LedgerAccountDto?> UpdateAsync(int id, LedgerAccountUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}
