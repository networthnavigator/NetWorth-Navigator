using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Services;

/// <summary>Creates a Booking (with at least Line 1 on the own-account ledger) from a transaction document line.</summary>
public class BookingFromLineService
{
    private readonly AppDbContext _context;

    public BookingFromLineService(AppDbContext context) => _context = context;

    /// <summary>Creates a booking for the document line and adds it to the context. Caller must SaveChanges. Line 1 is always the own-account ledger; Line 2 is contra when resolved from rules or override.</summary>
    /// <param name="line">The transaction document line (must have Id, OwnAccount, etc.).</param>
    /// <param name="document">Optional document for Reference; if null, line.Document is used (must be loaded).</param>
    /// <param name="ownAccountLedgerIdOverride">If set, used instead of resolving from BalanceSheetAccount.</param>
    /// <param name="contraLedgerAccountIdOverride">If set, used instead of business rules.</param>
    /// <returns>The created Booking (already added to context) and whether a contra line was added from a rule (and that rule's RequiresReview was applied).</returns>
    public async Task<(Booking Booking, bool HasContraLine)> CreateBookingForLineAsync(
        TransactionDocumentLine line,
        TransactionDocument? document,
        int? ownAccountLedgerIdOverride = null,
        int? contraLedgerAccountIdOverride = null,
        CancellationToken ct = default)
    {
        int? ownAccountLedgerId = ownAccountLedgerIdOverride;
        if (ownAccountLedgerId == null && !string.IsNullOrWhiteSpace(line.OwnAccount))
        {
            // First try OwnAccount rules (from Automated booking rules page)
            var ownAccountRules = await _context.BusinessRules
                .AsNoTracking()
                .Where(r => r.IsActive && r.MatchField.ToLower() == "ownaccount")
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.Id)
                .ToListAsync(ct);
            foreach (var rule in ownAccountRules)
            {
                if (Matches(line, rule))
                {
                    ownAccountLedgerId = rule.LedgerAccountId;
                    break;
                }
            }
            // Fallback: match by BalanceSheetAccount Name or AccountNumber (Assets & Liabilities → ledger link)
            if (ownAccountLedgerId == null)
            {
                var ownAccountKey = line.OwnAccount.Trim().ToLowerInvariant();
                var byName = await _context.BalanceSheetAccounts
                    .AsNoTracking()
                    .Where(a => a.LedgerAccountId != null && a.Name.ToLower() == ownAccountKey)
                    .Select(a => new { a.LedgerAccountId })
                    .FirstOrDefaultAsync(ct);
                if (byName != null)
                    ownAccountLedgerId = byName.LedgerAccountId;
                else
                {
                    var byNumber = await _context.BalanceSheetAccounts
                        .AsNoTracking()
                        .Where(a => a.LedgerAccountId != null && a.AccountNumber != null && a.AccountNumber.ToLower() == ownAccountKey)
                        .Select(a => new { a.LedgerAccountId })
                        .FirstOrDefaultAsync(ct);
                    if (byNumber != null)
                        ownAccountLedgerId = byNumber.LedgerAccountId;
                }
            }
        }

        if (ownAccountLedgerId == null)
            throw new ArgumentException($"No ledger linked for own account '{line.OwnAccount}'. Link the account to a ledger in Assets & Liabilities or provide OwnAccountLedgerId.");

        var ownLedgerExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == ownAccountLedgerId.Value, ct);
        if (!ownLedgerExists)
            throw new ArgumentException("OwnAccountLedgerId: LedgerAccount not found.");

        int? contraLedgerAccountId = contraLedgerAccountIdOverride;
        BusinessRule? appliedRule = null;
        if (contraLedgerAccountId == null)
        {
            // Only contra rules (exclude OwnAccount rules which are for line 1)
            var rules = await _context.BusinessRules
                .Include(r => r.LedgerAccount)
                .Where(r => r.IsActive && r.MatchField.ToLower() != "ownaccount")
                .OrderBy(r => r.SortOrder)
                .ToListAsync(ct);
            foreach (var rule in rules)
            {
                if (Matches(line, rule))
                {
                    contraLedgerAccountId = rule.LedgerAccountId;
                    appliedRule = rule;
                    break;
                }
            }
        }

        if (contraLedgerAccountId != null)
        {
            var contraLedgerExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == contraLedgerAccountId.Value, ct);
            if (!contraLedgerExists)
                throw new ArgumentException("ContraLedgerAccountId: LedgerAccount not found.");
            if (appliedRule?.SecondLedgerAccountId != null)
            {
                var secondExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == appliedRule.SecondLedgerAccountId.Value, ct);
                if (!secondExists)
                    throw new ArgumentException("SecondLedgerAccountId: LedgerAccount not found.");
            }
        }

        var doc = document ?? line.Document;
        var reference = doc != null ? $"Import {doc.SourceName ?? "?"} line {line.LineNumber}" : $"Line {line.LineNumber}";

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            Date = line.Date,
            Reference = reference,
            SourceDocumentLineId = line.Id,
            DateCreated = DateTime.UtcNow,
            CreatedByUser = "User",
            RequiresReview = appliedRule != null ? appliedRule.RequiresReview : true,
        };
        _context.Bookings.Add(booking);

        var amount = Math.Abs(line.Amount);

        _context.BookingLines.Add(new BookingLine
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            LineNumber = 0,
            LedgerAccountId = ownAccountLedgerId.Value,
            DebitAmount = line.Amount > 0 ? amount : 0,
            CreditAmount = line.Amount < 0 ? amount : 0,
            Currency = line.Currency,
            Description = line.Description,
        });

        if (contraLedgerAccountId != null)
        {
            if (appliedRule?.SecondLedgerAccountId != null)
            {
                // Two contra lines with amount 0 (user fills in later, e.g. mortgage interest 4001 + principal 0773)
                _context.BookingLines.Add(new BookingLine
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    LineNumber = 1,
                    LedgerAccountId = contraLedgerAccountId.Value,
                    DebitAmount = 0,
                    CreditAmount = 0,
                    Currency = line.Currency,
                    Description = line.ContraAccountName ?? line.Description,
                });
                _context.BookingLines.Add(new BookingLine
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    LineNumber = 2,
                    LedgerAccountId = appliedRule.SecondLedgerAccountId.Value,
                    DebitAmount = 0,
                    CreditAmount = 0,
                    Currency = line.Currency,
                    Description = line.ContraAccountName ?? line.Description,
                });
            }
            else
            {
                _context.BookingLines.Add(new BookingLine
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    LineNumber = 1,
                    LedgerAccountId = contraLedgerAccountId.Value,
                    DebitAmount = line.Amount < 0 ? amount : 0,
                    CreditAmount = line.Amount > 0 ? amount : 0,
                    Currency = line.Currency,
                    Description = line.ContraAccountName ?? line.ContraAccount,
                });
            }
        }

        return (booking, contraLedgerAccountId != null);
    }

    private static bool Matches(TransactionDocumentLine line, BusinessRule rule)
    {
        var value = rule.MatchField.ToUpperInvariant() switch
        {
            "OWNACCOUNT" => line.OwnAccount ?? "",
            "CONTRAACCOUNTNAME" => line.ContraAccountName ?? "",
            "CONTRAACCOUNT" => line.ContraAccount ?? "",
            "DESCRIPTION" => line.Description ?? "",
            _ => line.ContraAccountName ?? "",
        };
        var match = rule.MatchValue ?? "";
        return rule.MatchOperator.ToUpperInvariant() switch
        {
            "CONTAINS" => value.Contains(match, StringComparison.OrdinalIgnoreCase),
            "EQUALS" => string.Equals(value, match, StringComparison.OrdinalIgnoreCase),
            "STARTSWITH" => value.StartsWith(match, StringComparison.OrdinalIgnoreCase),
            _ => value.Contains(match, StringComparison.OrdinalIgnoreCase),
        };
    }
}
