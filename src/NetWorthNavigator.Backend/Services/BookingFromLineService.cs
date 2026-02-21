using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain;
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
            // First try OwnAccount rules (from Automated booking rules page). More specific rules (more criteria) first.
            var ownAccountRules = await _context.BusinessRules
                .AsNoTracking()
                .Where(r => r.IsActive && r.MatchField.ToLower() == "ownaccount")
                .ToListAsync(ct);
            var ownOrdered = ownAccountRules
                .OrderByDescending(r => BusinessRuleCriteria.GetCriteria(r).Count)
                .ThenBy(r => r.SortOrder)
                .ThenBy(r => r.Id)
                .ToList();
            foreach (var rule in ownOrdered)
            {
                if (MatchesAll(line, rule))
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

        var matchingRules = new List<BusinessRule>();
        if (contraLedgerAccountIdOverride.HasValue && contraLedgerAccountIdOverride.Value > 0)
        {
            matchingRules.Add(new BusinessRule { LedgerAccountId = contraLedgerAccountIdOverride.Value, LineItemsJson = null, SecondLedgerAccountId = null });
        }
        else
        {
            var rules = await _context.BusinessRules
                .Include(r => r.LedgerAccount)
                .Where(r => r.IsActive && (r.MatchField.ToLower() != "ownaccount" || !r.IsSystemGenerated))
                .ToListAsync(ct);
            var contraOrdered = rules
                .OrderByDescending(r => BusinessRuleCriteria.GetCriteria(r).Count)
                .ThenBy(r => r.SortOrder)
                .ThenBy(r => r.Id)
                .ToList();
            foreach (var rule in contraOrdered)
            {
                if (MatchesAll(line, rule))
                    matchingRules.Add(rule);
            }
        }

        foreach (var r in matchingRules)
        {
            if (r.LedgerAccountId <= 0) continue;
            var ledgerExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == r.LedgerAccountId, ct);
            if (!ledgerExists)
                throw new ArgumentException($"LedgerAccountId {r.LedgerAccountId} not found.");
        }

        var doc = document ?? line.Document;
        var reference = doc != null ? $"Import {doc.SourceName ?? "?"} line {line.LineNumber}" : $"Line {line.LineNumber}";

        var requiresReview = matchingRules.Count > 0 ? matchingRules.Any(r => r.RequiresReview) : true;
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            Date = line.Date,
            Reference = reference,
            SourceDocumentLineId = line.Id,
            DateCreated = DateTime.UtcNow,
            CreatedByUser = "User",
            RequiresReview = requiresReview,
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
            RequiresReview = false,
            ReviewedAt = DateTime.UtcNow,
        });

        int lineNumber = 1;
        var addedLedgerIds = new HashSet<int> { ownAccountLedgerId.Value };
        foreach (var rule in matchingRules)
        {
            var ruleLineItems = BusinessRuleLineItems.GetLineItems(rule);
            foreach (var li in ruleLineItems)
            {
                var ledgerExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == li.LedgerAccountId, ct);
                if (!ledgerExists) continue;
                if (addedLedgerIds.Contains(li.LedgerAccountId)) continue;
                var debitAmount = li.AmountType == "Zero" ? 0m : (line.Amount < 0 ? amount : 0m);
                var creditAmount = li.AmountType == "Zero" ? 0m : (line.Amount > 0 ? amount : 0m);
                var lineRequiresReview = rule.RequiresReview;
                _context.BookingLines.Add(new BookingLine
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    LineNumber = lineNumber++,
                    LedgerAccountId = li.LedgerAccountId,
                    DebitAmount = debitAmount,
                    CreditAmount = creditAmount,
                    Currency = line.Currency,
                    Description = line.ContraAccountName ?? line.Description,
                    RequiresReview = lineRequiresReview,
                    ReviewedAt = lineRequiresReview ? null : DateTime.UtcNow,
                    BusinessRuleId = rule.Id > 0 ? rule.Id : null,
                });
                addedLedgerIds.Add(li.LedgerAccountId);
            }
        }

        return (booking, matchingRules.Count > 0);
    }

    /// <summary>Adds or replaces contra line(s) from all matching business rules. Lines created by a rule are replaced when that rule matches again. Caller must SaveChanges.</summary>
    /// <returns>True if one or more lines were added or replaced.</returns>
    public async Task<bool> AddRuleLinesToExistingBookingAsync(Booking booking, TransactionDocumentLine line, CancellationToken ct = default)
    {
        var lines = (booking.Lines ?? new List<BookingLine>()).ToList();

        var rules = await _context.BusinessRules
            .Include(r => r.LedgerAccount)
            .Where(r => r.IsActive && (r.MatchField.ToLower() != "ownaccount" || !r.IsSystemGenerated))
            .ToListAsync(ct);
        var contraOrdered = rules
            .OrderByDescending(r => BusinessRuleCriteria.GetCriteria(r).Count)
            .ThenBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .ToList();
        var matchingRules = contraOrdered.Where(r => MatchesAll(line, r)).ToList();
        if (matchingRules.Count == 0)
            return false;

        var amount = Math.Abs(line.Amount);
        var changed = false;

        foreach (var rule in matchingRules)
        {
            var existingFromRule = lines.Where(l => l.BusinessRuleId == rule.Id).ToList();
            foreach (var old in existingFromRule)
            {
                _context.BookingLines.Remove(old);
                lines.Remove(old);
                changed = true;
            }

            var ruleLineItems = BusinessRuleLineItems.GetLineItems(rule);
            var nextLineNumber = lines.Count > 0 ? lines.Max(l => l.LineNumber) + 1 : 0;
            var existingLedgerIds = lines.Select(l => l.LedgerAccountId).ToHashSet();
            foreach (var li in ruleLineItems)
            {
                var ledgerExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == li.LedgerAccountId, ct);
                if (!ledgerExists) continue;
                if (existingLedgerIds.Contains(li.LedgerAccountId)) continue;
                var debitAmount = li.AmountType == "Zero" ? 0m : (line.Amount < 0 ? amount : 0m);
                var creditAmount = li.AmountType == "Zero" ? 0m : (line.Amount > 0 ? amount : 0m);
                var lineRequiresReview = rule.RequiresReview;
                var newLine = new BookingLine
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    LineNumber = nextLineNumber++,
                    LedgerAccountId = li.LedgerAccountId,
                    DebitAmount = debitAmount,
                    CreditAmount = creditAmount,
                    Currency = line.Currency,
                    Description = line.ContraAccountName ?? line.ContraAccount,
                    RequiresReview = lineRequiresReview,
                    ReviewedAt = lineRequiresReview ? null : DateTime.UtcNow,
                    BusinessRuleId = rule.Id,
                };
                _context.BookingLines.Add(newLine);
                lines.Add(newLine);
                existingLedgerIds.Add(li.LedgerAccountId);
                changed = true;
            }
        }

        if (changed)
        {
            var ordered = lines.OrderBy(l => l.LineNumber).ToList();
            for (var i = 0; i < ordered.Count; i++)
            {
                if (ordered[i].LineNumber != i)
                {
                    ordered[i].LineNumber = i;
                }
            }
        }

        return changed;
    }

    /// <summary>Returns true if the transaction line matches all criteria of the rule. Used to list bookings that match a rule.</summary>
    public static bool MatchesRule(TransactionDocumentLine line, BusinessRule rule)
    {
        return MatchesAll(line, rule);
    }

    private static bool MatchesAll(TransactionDocumentLine line, BusinessRule rule)
    {
        var criteria = BusinessRuleCriteria.GetCriteria(rule);
        foreach (var c in criteria)
        {
            if (!MatchesOne(line, c.MatchField, c.MatchOperator, c.MatchValue))
                return false;
        }
        return true;
    }

    private static bool MatchesOne(TransactionDocumentLine line, string matchField, string matchOperator, string matchValue)
    {
        var value = (matchField ?? "").ToUpperInvariant() switch
        {
            "OWNACCOUNT" => line.OwnAccount ?? "",
            "CONTRAACCOUNTNAME" => line.ContraAccountName ?? "",
            "CONTRAACCOUNT" => line.ContraAccount ?? "",
            "DESCRIPTION" => line.Description ?? "",
            _ => line.ContraAccountName ?? "",
        };
        var match = matchValue ?? "";
        return (matchOperator ?? "").ToUpperInvariant() switch
        {
            "CONTAINS" => value.Contains(match, StringComparison.OrdinalIgnoreCase),
            "EQUALS" => string.Equals(value.Trim(), match.Trim(), StringComparison.OrdinalIgnoreCase),
            "STARTSWITH" => value.StartsWith(match, StringComparison.OrdinalIgnoreCase),
            _ => value.Contains(match, StringComparison.OrdinalIgnoreCase),
        };
    }
}
