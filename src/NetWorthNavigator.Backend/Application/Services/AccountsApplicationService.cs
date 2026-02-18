using NetWorthNavigator.Backend.Application.DTOs;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Domain.Repositories;

namespace NetWorthNavigator.Backend.Application.Services;

/// <summary>Application service (use case) for balance-sheet accounts. Clean Architecture: Application layer.</summary>
public sealed class AccountsApplicationService : IAccountsApplicationService
{
    private readonly IBalanceSheetAccountRepository _accounts;
    private readonly ILedgerAccountRepository _ledger;

    public AccountsApplicationService(IBalanceSheetAccountRepository accounts, ILedgerAccountRepository ledger)
    {
        _accounts = accounts;
        _ledger = ledger;
    }

    public async Task<IReadOnlyList<BalanceSheetAccountDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await _accounts.GetAllAsync(ct);
        return list.Select(MapToDto).ToList();
    }

    public async Task<BalanceSheetAccountDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _accounts.GetByIdAsync(id, ct);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<BalanceSheetAccountDto> CreateAsync(BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct = default)
    {
        if (!dto.LedgerAccountId.HasValue || dto.LedgerAccountId.Value <= 0)
            throw new ArgumentException("Ledger account is required. Select an account from the Assets category in Chart of accounts.");
        var ledger = await _ledger.GetByIdAsync(dto.LedgerAccountId.Value, ct);
        if (ledger == null)
            throw new ArgumentException("Selected ledger account was not found.");
        var nextOrder = await _accounts.GetNextSortOrderAsync(ct);
        var entity = new BalanceSheetAccount
        {
            AccountNumber = string.IsNullOrWhiteSpace(dto.AccountNumber) ? null : dto.AccountNumber.Trim(),
            Name = dto.Name ?? "",
            CurrentBalance = dto.CurrentBalance ?? 0,
            Currency = dto.Currency ?? "EUR",
            SortOrder = nextOrder,
            LedgerAccountId = dto.LedgerAccountId,
        };
        var added = await _accounts.AddAsync(entity, ct);
        return MapToDto(added);
    }

    public async Task<BalanceSheetAccountDto?> UpdateAsync(int id, BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct = default)
    {
        var existing = await _accounts.GetByIdAsync(id, ct);
        if (existing == null) return null;
        if (dto.AccountNumber != null) existing.AccountNumber = string.IsNullOrWhiteSpace(dto.AccountNumber) ? null : dto.AccountNumber.Trim();
        if (dto.Name != null) existing.Name = dto.Name;
        if (dto.CurrentBalance.HasValue) existing.CurrentBalance = dto.CurrentBalance.Value;
        if (dto.Currency != null) existing.Currency = dto.Currency;
        if (dto.LedgerAccountId.HasValue && dto.LedgerAccountId.Value > 0)
        {
            var ledger = await _ledger.GetByIdAsync(dto.LedgerAccountId.Value, ct);
            if (ledger == null)
                throw new ArgumentException("Selected ledger account was not found.");
            existing.LedgerAccountId = dto.LedgerAccountId.Value;
        }
        else if (dto.LedgerAccountId == null || dto.LedgerAccountId == 0)
        {
            if (!existing.LedgerAccountId.HasValue)
                throw new ArgumentException("Ledger account is required. Select an account from the Assets category.");
            // Leave existing ledger as is when not provided (partial update)
        }
        await _accounts.UpdateAsync(existing, ct);
        var updated = await _accounts.GetByIdAsync(id, ct);
        return updated == null ? null : MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var existing = await _accounts.GetByIdAsync(id, ct);
        if (existing == null) return false;
        await _accounts.DeleteAsync(id, ct);
        return true;
    }

    private static BalanceSheetAccountDto MapToDto(BalanceSheetAccount a)
    {
        return new BalanceSheetAccountDto
        {
            Id = a.Id,
            AccountNumber = a.AccountNumber,
            Name = a.Name,
            CurrentBalance = a.CurrentBalance,
            Currency = a.Currency,
            SortOrder = a.SortOrder,
            LedgerAccountId = a.LedgerAccountId,
            LedgerAccountName = a.LedgerAccount != null ? $"{a.LedgerAccount.Code} {a.LedgerAccount.Name}" : null,
        };
    }
}
