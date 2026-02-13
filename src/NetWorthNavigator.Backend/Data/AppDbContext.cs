using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<BankTransactionsHeader> BankTransactionsHeaders => Set<BankTransactionsHeader>();
    public DbSet<AccountStructure> AccountStructures => Set<AccountStructure>();
    public DbSet<LedgerAccount> LedgerAccounts => Set<LedgerAccount>();
    public DbSet<BalanceSheetAccount> BalanceSheetAccounts => Set<BalanceSheetAccount>();
    public DbSet<InvestmentAccount> InvestmentAccounts => Set<InvestmentAccount>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyValuation> PropertyValuations => Set<PropertyValuation>();
    public DbSet<Mortgage> Mortgages => Set<Mortgage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<BankTransactionsHeader>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OwnAccount).HasMaxLength(64);
            entity.Property(e => e.ContraAccount).HasMaxLength(64);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.BalanceAfter).HasPrecision(18, 2);
            entity.Property(e => e.OriginalCsvLine).HasMaxLength(2000);
            entity.Property(e => e.Hash).HasMaxLength(64);
            entity.Property(e => e.CreatedByUser).HasMaxLength(128);
            entity.Property(e => e.CreatedByProcess).HasMaxLength(64);
            entity.Property(e => e.SourceName).HasMaxLength(256);
            entity.Property(e => e.Status).HasMaxLength(32);
            entity.Property(e => e.Period).HasMaxLength(7);  // yyyy-MM
            entity.Property(e => e.UserComments).HasMaxLength(1000);
            entity.Property(e => e.Tag).HasMaxLength(128);
        });
        modelBuilder.Entity<AccountStructure>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Parent).WithMany(e => e.Children).HasForeignKey(e => e.ParentId).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Code).HasMaxLength(16);
            entity.Property(e => e.Name).HasMaxLength(128);
        });
        modelBuilder.Entity<LedgerAccount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.AccountStructure).WithMany(e => e.LedgerAccounts).HasForeignKey(e => e.AccountStructureId).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Code).HasMaxLength(16);
            entity.Property(e => e.Name).HasMaxLength(128);
        });
        modelBuilder.Entity<BalanceSheetAccount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.CurrentBalance).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
        });
        modelBuilder.Entity<InvestmentAccount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.CurrentBalance).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
        });
        modelBuilder.Entity<Property>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.PurchaseValue).HasPrecision(18, 2);
            entity.Property(e => e.PurchaseDate);
            entity.Property(e => e.Currency).HasMaxLength(3);
        });
        modelBuilder.Entity<PropertyValuation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Property).WithMany().HasForeignKey(e => e.PropertyId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Value).HasPrecision(18, 2);
        });
        modelBuilder.Entity<Mortgage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.StartValue).HasPrecision(18, 2);
            entity.Property(e => e.CurrentInterestRate).HasPrecision(8, 2);
            entity.Property(e => e.IsPaidOff).HasConversion<int>(); // SQLite stores bool as INTEGER
            entity.Property(e => e.AmortizationType).HasConversion<int>(); // SQLite stores enum as INTEGER
            entity.Property(e => e.CurrentValue).HasPrecision(18, 2);
            entity.Property(e => e.ExtraPaidOff).HasPrecision(18, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
        });
    }
}
