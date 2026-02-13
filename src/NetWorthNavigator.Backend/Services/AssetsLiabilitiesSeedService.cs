using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Services;

public class AssetsLiabilitiesSeedService
{
    private readonly AppDbContext _context;

    public AssetsLiabilitiesSeedService(AppDbContext context) => _context = context;

    /// <summary>Imports assets & liabilities data (accounts, investment accounts, properties, mortgages) from JSON.</summary>
    public async Task<AssetsLiabilitiesSeedResult> ImportFromJsonAsync(string json)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var data = JsonSerializer.Deserialize<AssetsLiabilitiesSeedData>(json, options)
            ?? throw new ArgumentException("Invalid JSON: expected assets & liabilities seed data object.");

        int accountsCount = 0;
        int investmentAccountsCount = 0;
        int propertiesCount = 0;
        int mortgagesCount = 0;

        // Seed accounts
        if (data.Accounts != null)
        {
            foreach (var item in data.Accounts)
            {
                var exists = await _context.BalanceSheetAccounts
                    .AnyAsync(a => a.Name == (item.Name ?? "").Trim());
                if (exists) continue;

                _context.BalanceSheetAccounts.Add(new BalanceSheetAccount
                {
                    Name = (item.Name ?? "").Trim(),
                    CurrentBalance = item.CurrentBalance,
                    Currency = item.Currency ?? "EUR",
                    SortOrder = item.SortOrder,
                });
                accountsCount++;
            }
        }

        // Seed investment accounts
        if (data.InvestmentAccounts != null)
        {
            foreach (var item in data.InvestmentAccounts)
            {
                var exists = await _context.InvestmentAccounts
                    .AnyAsync(a => a.Name == (item.Name ?? "").Trim());
                if (exists) continue;

                _context.InvestmentAccounts.Add(new InvestmentAccount
                {
                    Name = (item.Name ?? "").Trim(),
                    CurrentBalance = item.CurrentBalance,
                    Currency = item.Currency ?? "EUR",
                    SortOrder = item.SortOrder,
                });
                investmentAccountsCount++;
            }
        }

        // Seed properties
        if (data.Properties != null)
        {
            foreach (var item in data.Properties)
            {
                var exists = await _context.Properties
                    .AnyAsync(p => p.Name == (item.Name ?? "").Trim());
                if (exists) continue;

                _context.Properties.Add(new Property
                {
                    Name = (item.Name ?? "").Trim(),
                    PurchaseValue = item.PurchaseValue,
                    PurchaseDate = item.PurchaseDate,
                    Currency = item.Currency ?? "EUR",
                    SortOrder = item.SortOrder,
                });
                propertiesCount++;
            }
        }

        // Seed mortgages
        if (data.Mortgages != null)
        {
            foreach (var item in data.Mortgages)
            {
                var exists = await _context.Mortgages
                    .AnyAsync(m => m.Name == (item.Name ?? "").Trim());
                if (exists) continue;

                _context.Mortgages.Add(new Mortgage
                {
                    Name = (item.Name ?? "").Trim(),
                    StartValue = item.StartValue,
                    InterestStartDate = item.InterestStartDate,
                    TermYears = item.TermYears,
                    CurrentInterestRate = item.CurrentInterestRate,
                    FixedRatePeriodYears = item.FixedRatePeriodYears,
                    AmortizationType = item.AmortizationType,
                    IsPaidOff = item.IsPaidOff,
                    CurrentValue = item.CurrentValue,
                    ExtraPaidOff = item.ExtraPaidOff,
                    Currency = item.Currency ?? "EUR",
                    SortOrder = item.SortOrder,
                });
                mortgagesCount++;
            }
        }

        await _context.SaveChangesAsync();
        return new AssetsLiabilitiesSeedResult
        {
            AccountsAdded = accountsCount,
            InvestmentAccountsAdded = investmentAccountsCount,
            PropertiesAdded = propertiesCount,
            MortgagesAdded = mortgagesCount,
        };
    }

    /// <summary>Exports current balance sheet data to JSON format.</summary>
    public async Task<string> ExportToJsonAsync()
    {
        var accounts = await _context.BalanceSheetAccounts
            .AsNoTracking()
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .Select(a => new AccountSeedItem
            {
                Name = a.Name,
                CurrentBalance = a.CurrentBalance,
                Currency = a.Currency,
                SortOrder = a.SortOrder,
            })
            .ToArrayAsync();

        var investmentAccounts = await _context.InvestmentAccounts
            .AsNoTracking()
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .Select(a => new InvestmentAccountSeedItem
            {
                Name = a.Name,
                CurrentBalance = a.CurrentBalance,
                Currency = a.Currency,
                SortOrder = a.SortOrder,
            })
            .ToArrayAsync();

        var properties = await _context.Properties
            .AsNoTracking()
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Name)
            .Select(p => new PropertySeedItem
            {
                Name = p.Name,
                PurchaseValue = p.PurchaseValue,
                PurchaseDate = p.PurchaseDate,
                Currency = p.Currency,
                SortOrder = p.SortOrder,
            })
            .ToArrayAsync();

        var mortgages = await _context.Mortgages
            .AsNoTracking()
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Name)
            .Select(m => new MortgageSeedItem
            {
                Name = m.Name,
                StartValue = m.StartValue,
                InterestStartDate = m.InterestStartDate,
                TermYears = m.TermYears,
                CurrentInterestRate = m.CurrentInterestRate,
                FixedRatePeriodYears = m.FixedRatePeriodYears,
                AmortizationType = m.AmortizationType,
                IsPaidOff = m.IsPaidOff,
                CurrentValue = m.CurrentValue,
                ExtraPaidOff = m.ExtraPaidOff,
                Currency = m.Currency,
                SortOrder = m.SortOrder,
            })
            .ToArrayAsync();

        var data = new AssetsLiabilitiesSeedData
        {
            Accounts = accounts,
            InvestmentAccounts = investmentAccounts,
            Properties = properties,
            Mortgages = mortgages,
        };

        var options = new JsonSerializerOptions { WriteIndented = true };
        return JsonSerializer.Serialize(data, options);
    }

    private sealed class AssetsLiabilitiesSeedData
    {
        public AccountSeedItem[]? Accounts { get; set; }
        public InvestmentAccountSeedItem[]? InvestmentAccounts { get; set; }
        public PropertySeedItem[]? Properties { get; set; }
        public MortgageSeedItem[]? Mortgages { get; set; }
    }

    private sealed class AccountSeedItem
    {
        public string? Name { get; set; }
        public decimal CurrentBalance { get; set; }
        public string? Currency { get; set; }
        public int SortOrder { get; set; }
    }

    private sealed class InvestmentAccountSeedItem
    {
        public string? Name { get; set; }
        public decimal CurrentBalance { get; set; }
        public string? Currency { get; set; }
        public int SortOrder { get; set; }
    }

    private sealed class PropertySeedItem
    {
        public string? Name { get; set; }
        public decimal? PurchaseValue { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Currency { get; set; }
        public int SortOrder { get; set; }
    }

    private sealed class MortgageSeedItem
    {
        public string? Name { get; set; }
        public decimal StartValue { get; set; }
        public DateTime InterestStartDate { get; set; }
        public int TermYears { get; set; }
        public decimal CurrentInterestRate { get; set; }
        public int FixedRatePeriodYears { get; set; }
        public AmortizationType AmortizationType { get; set; }
        public bool IsPaidOff { get; set; }
        public decimal? CurrentValue { get; set; }
        public decimal ExtraPaidOff { get; set; }
        public string? Currency { get; set; }
        public int SortOrder { get; set; }
    }
}

public class AssetsLiabilitiesSeedResult
{
    public int AccountsAdded { get; set; }
    public int InvestmentAccountsAdded { get; set; }
    public int PropertiesAdded { get; set; }
    public int MortgagesAdded { get; set; }
}
