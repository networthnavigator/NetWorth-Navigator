using NetWorthNavigator.Backend.Application.DTOs;

namespace NetWorthNavigator.Backend.Application.Services;

/// <summary>Application service (use case) for balance-sheet accounts. Clean Architecture: Application layer.</summary>
public interface IAccountsApplicationService
{
    Task<IReadOnlyList<BalanceSheetAccountDto>> GetAllAsync(CancellationToken ct = default);
    Task<BalanceSheetAccountDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<BalanceSheetAccountDto> CreateAsync(BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct = default);
    Task<BalanceSheetAccountDto?> UpdateAsync(int id, BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}
