using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BookingsController(AppDbContext context) => _context = context;

    /// <summary>POST /api/bookings/from-line - PoC: Create a booking from a transaction document line. Optionally applies first matching business rule for the contra ledger account.</summary>
    [HttpPost("from-line")]
    public async Task<ActionResult<object>> CreateFromDocumentLine(
        [FromBody] CreateBookingFromLineRequest request,
        CancellationToken ct = default)
    {
        var line = await _context.TransactionDocumentLines
            .Include(l => l.Document)
            .FirstOrDefaultAsync(l => l.Id == request.DocumentLineId, ct);
        if (line == null)
            return NotFound(new { error = "Transaction document line not found" });

        // Optional: resolve contra ledger account from business rules (e.g. ContraAccountName contains "Albert Heijn" -> Boodschappen)
        int? contraLedgerAccountId = request.ContraLedgerAccountId;
        if (contraLedgerAccountId == null)
        {
            var rules = await _context.BusinessRules
                .Include(r => r.LedgerAccount)
                .Where(r => r.IsActive)
                .OrderBy(r => r.SortOrder)
                .ToListAsync(ct);
            foreach (var rule in rules)
            {
                if (Matches(line, rule))
                {
                    contraLedgerAccountId = rule.LedgerAccountId;
                    break;
                }
            }
        }

        if (contraLedgerAccountId == null)
            return BadRequest(new { error = "No contra ledger account. Set ContraLedgerAccountId or add a matching BusinessRule." });

        var ledgerAccountExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == contraLedgerAccountId.Value, ct);
        if (!ledgerAccountExists)
            return BadRequest(new { error = "LedgerAccount not found" });

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            Date = line.Date,
            Reference = $"Import {line.Document?.SourceName ?? "?"} line {line.LineNumber}",
            SourceDocumentLineId = line.Id,
            DateCreated = DateTime.UtcNow,
            CreatedByUser = "User",
        };
        _context.Bookings.Add(booking);

        // Line 1: debit or credit on a "bank" ledger account (we don't have BalanceSheetAccount->LedgerAccount here; use request.OwnAccountLedgerId if provided)
        // Line 2: contra on the rule/resolved ledger account
        var amount = Math.Abs(line.Amount);
        if (request.OwnAccountLedgerId != null)
        {
            _context.BookingLines.Add(new BookingLine
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                LineNumber = 0,
                LedgerAccountId = request.OwnAccountLedgerId.Value,
                DebitAmount = line.Amount > 0 ? amount : 0,
                CreditAmount = line.Amount < 0 ? amount : 0,
                Currency = line.Currency,
                Description = line.Description,
            });
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
        else
        {
            // Single line: only the contra side (PoC; full double-entry would need OwnAccountLedgerId)
            _context.BookingLines.Add(new BookingLine
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                LineNumber = 0,
                LedgerAccountId = contraLedgerAccountId.Value,
                DebitAmount = line.Amount < 0 ? amount : 0,
                CreditAmount = line.Amount > 0 ? amount : 0,
                Currency = line.Currency,
                Description = line.ContraAccountName ?? line.ContraAccount,
            });
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { bookingId = booking.Id, date = booking.Date, reference = booking.Reference, appliedRule = contraLedgerAccountId != null });
    }

    private static bool Matches(TransactionDocumentLine line, BusinessRule rule)
    {
        var value = rule.MatchField.ToUpperInvariant() switch
        {
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

public class CreateBookingFromLineRequest
{
    public Guid DocumentLineId { get; set; }
    /// <summary>Ledger account for the "own" side (e.g. bank account). If null, only contra line is created (PoC).</summary>
    public int? OwnAccountLedgerId { get; set; }
    /// <summary>Ledger account for the contra side. If null, first matching BusinessRule is used.</summary>
    public int? ContraLedgerAccountId { get; set; }
}
