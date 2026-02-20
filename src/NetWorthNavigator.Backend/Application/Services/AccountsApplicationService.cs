using NetWorthNavigator.Backend.Application.DTOs;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Domain.Repositories;

namespace NetWorthNavigator.Backend.Application.Services;

/// <summary>Application service (use case) for balance-sheet accounts. Clean Architecture: Application layer.</summary>
public sealed class AccountsApplicationService : IAccountsApplicationService
{
    private readonly IBalanceSheetAccountRepository _accounts;
    private readonly ILedgerAccountRepository _ledger;
    private readonly ILedgerBalanceService _ledgerBalance;

    public AccountsApplicationService(IBalanceSheetAccountRepository accounts, ILedgerAccountRepository ledger, ILedgerBalanceService ledgerBalance)
    {
        _accounts = accounts;
        _ledger = ledger;
        _ledgerBalance = ledgerBalance;
    }

    public async Task<IReadOnlyList<BalanceSheetAccountDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await _accounts.GetAllAsync(ct);
        var ledgerIds = list.Where(a => a.LedgerAccountId.HasValue).Select(a => a.LedgerAccountId!.Value).ToList();
        var balances = ledgerIds.Count > 0 ? await _ledgerBalance.GetBalancesByLedgerAccountIdsAsync(ledgerIds, ct) : new Dictionary<int, decimal>();
        return list.Select(a => MapToDto(a, balances)).ToList();
    }

    public async Task<BalanceSheetAccountDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _accounts.GetByIdAsync(id, ct);
        if (entity == null) return null;
        var balances = entity.LedgerAccountId.HasValue
            ? await _ledgerBalance.GetBalancesByLedgerAccountIdsAsync(new[] { entity.LedgerAccountId.Value }, ct)
            : new Dictionary<int, decimal>();
        return MapToDto(entity, balances);
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
            OpeningBalanceOffset = dto.OpeningBalanceOffset,
            Currency = dto.Currency ?? "EUR",
            SortOrder = nextOrder,
            LedgerAccountId = dto.LedgerAccountId,
        };
        var added = await _accounts.AddAsync(entity, ct);
        var balances = added.LedgerAccountId.HasValue
            ? await _ledgerBalance.GetBalancesByLedgerAccountIdsAsync(new[] { added.LedgerAccountId.Value }, ct)
            : new Dictionary<int, decimal>();
        return MapToDto(added, balances);
    }

    public async Task<BalanceSheetAccountDto?> UpdateAsync(int id, BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct = default)
    {
        var existing = await _accounts.GetByIdAsync(id, ct);
        if (existing == null) return null;
        if (dto.AccountNumber != null) existing.AccountNumber = string.IsNullOrWhiteSpace(dto.AccountNumber) ? null : dto.AccountNumber.Trim();
        if (dto.Name != null) existing.Name = dto.Name;
        if (dto.CurrentBalance.HasValue) existing.CurrentBalance = dto.CurrentBalance.Value;
        existing.OpeningBalanceOffset = dto.OpeningBalanceOffset;
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
        if (updated == null) return null;
        var balances = updated.LedgerAccountId.HasValue
            ? await _ledgerBalance.GetBalancesByLedgerAccountIdsAsync(new[] { updated.LedgerAccountId.Value }, ct)
            : new Dictionary<int, decimal>();
        return MapToDto(updated, balances);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var existing = await _accounts.GetByIdAsync(id, ct);
        if (existing == null) return false;
        await _accounts.DeleteAsync(id, ct);
        return true;
    }

    private static BalanceSheetAccountDto MapToDto(BalanceSheetAccount a, IReadOnlyDictionary<int, decimal> ledgerBalances)
    {
        decimal currentBalance = a.CurrentBalance;
        if (a.LedgerAccountId.HasValue && ledgerBalances.TryGetValue(a.LedgerAccountId.Value, out var ledgerBalance))
            currentBalance = (a.OpeningBalanceOffset ?? 0) + ledgerBalance;

        return new BalanceSheetAccountDto
        {
            Id = a.Id,
            AccountNumber = a.AccountNumber,
            Name = a.Name,
            CurrentBalance = currentBalance,
            OpeningBalanceOffset = a.OpeningBalanceOffset,
            Currency = a.Currency,
            SortOrder = a.SortOrder,
            LedgerAccountId = a.LedgerAccountId,
            LedgerAccountName = a.LedgerAccount != null ? $"{a.LedgerAccount.Code} {a.LedgerAccount.Name}" : null,
        };
    }
}
