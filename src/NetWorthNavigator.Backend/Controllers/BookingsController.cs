using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly BookingFromLineService _bookingFromLineService;

    public BookingsController(AppDbContext context, BookingFromLineService bookingFromLineService)
    {
        _context = context;
        _bookingFromLineService = bookingFromLineService;
    }

    /// <summary>GET /api/bookings - All bookings with their lines and ledger account info. For UI to show bookings and detect out-of-balance.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BookingWithLinesDto>>> GetAll(CancellationToken ct = default)
    {
        var bookings = await _context.Bookings
            .Include(b => b.Lines)
            .ThenInclude(l => l.LedgerAccount)
            .OrderByDescending(b => b.Date)
            .ThenBy(b => b.Reference)
            .ToListAsync(ct);

        var dtos = bookings.Select(b => new BookingWithLinesDto
        {
            Id = b.Id,
            Date = b.Date,
            Reference = b.Reference,
            SourceDocumentLineId = b.SourceDocumentLineId,
            DateCreated = b.DateCreated,
            CreatedByUser = b.CreatedByUser,
            RequiresReview = b.RequiresReview,
            ReviewedAt = b.ReviewedAt,
            Lines = b.Lines.OrderBy(l => l.LineNumber).Select(l => new BookingLineDto
            {
                Id = l.Id,
                LineNumber = l.LineNumber,
                LedgerAccountId = l.LedgerAccountId,
                LedgerAccountCode = l.LedgerAccount?.Code,
                LedgerAccountName = l.LedgerAccount?.Name,
                DebitAmount = l.DebitAmount,
                CreditAmount = l.CreditAmount,
                Currency = l.Currency,
                Description = l.Description,
            }).ToList(),
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>GET /api/bookings/by-source-line/{documentLineId} - Booking (with lines) for a transaction document line, if any.</summary>
    [HttpGet("by-source-line/{documentLineId:guid}")]
    public async Task<ActionResult<BookingWithLinesDto>> GetBySourceDocumentLine(Guid documentLineId, CancellationToken ct = default)
    {
        var booking = await _context.Bookings
            .Include(b => b.Lines)
            .ThenInclude(l => l.LedgerAccount)
            .FirstOrDefaultAsync(b => b.SourceDocumentLineId == documentLineId, ct);
        if (booking == null)
            return NotFound();

        var dto = new BookingWithLinesDto
        {
            Id = booking.Id,
            Date = booking.Date,
            Reference = booking.Reference,
            SourceDocumentLineId = booking.SourceDocumentLineId,
            DateCreated = booking.DateCreated,
            CreatedByUser = booking.CreatedByUser,
            RequiresReview = booking.RequiresReview,
            ReviewedAt = booking.ReviewedAt,
            Lines = booking.Lines.OrderBy(l => l.LineNumber).Select(l => new BookingLineDto
            {
                Id = l.Id,
                LineNumber = l.LineNumber,
                LedgerAccountId = l.LedgerAccountId,
                LedgerAccountCode = l.LedgerAccount?.Code,
                LedgerAccountName = l.LedgerAccount?.Name,
                DebitAmount = l.DebitAmount,
                CreditAmount = l.CreditAmount,
                Currency = l.Currency,
                Description = l.Description,
            }).ToList(),
        };
        return Ok(dto);
    }

    /// <summary>PUT /api/bookings/{id}/reviewed - Mark a booking as reviewed/approved by the user. Fails if the booking is not in balance (debits ≠ credits).</summary>
    [HttpPut("{id:guid}/reviewed")]
    public async Task<IActionResult> MarkReviewed(Guid id, CancellationToken ct = default)
    {
        var booking = await _context.Bookings.Include(b => b.Lines).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking == null)
            return NotFound(new { error = "Booking not found" });
        var lines = booking.Lines ?? new List<BookingLine>();
        foreach (var group in lines.GroupBy(l => l.Currency ?? "EUR"))
        {
            var totalDebit = group.Sum(l => l.DebitAmount);
            var totalCredit = group.Sum(l => l.CreditAmount);
            if (Math.Abs(totalDebit - totalCredit) > 0.001m)
                return BadRequest(new { error = "Booking is not in balance (debits must equal credits). Add or adjust lines so that total debits equal total credits per currency." });
        }
        booking.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>POST /api/bookings/from-line - Create a booking from a transaction document line. Optionally applies first matching business rule for the contra ledger account.</summary>
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

        try
        {
            var (booking, hasContraLine) = await _bookingFromLineService.CreateBookingForLineAsync(
                line, null,
                request.OwnAccountLedgerId,
                request.ContraLedgerAccountId,
                ct);
            await _context.SaveChangesAsync(ct);
            return Ok(new { bookingId = booking.Id, date = booking.Date, reference = booking.Reference, appliedRule = hasContraLine });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/bookings/recreate-by-scope - Recreate bookings for transaction lines so the current rules (e.g. a just-saved rule) are applied. Use after creating/editing a booking rule.</summary>
    [HttpPost("recreate-by-scope")]
    public async Task<ActionResult<RecreateByScopeResult>> RecreateByScope(
        [FromBody] RecreateByScopeRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(request.Scope))
            return BadRequest(new { error = "Scope is required (ThisBooking, PendingOnly, or All)" });
        var scope = request.Scope.Trim();
        List<Guid> lineIdsToProcess;
        if (scope.Equals("ThisBooking", StringComparison.OrdinalIgnoreCase))
        {
            if (!request.DocumentLineId.HasValue)
                return BadRequest(new { error = "DocumentLineId is required when scope is ThisBooking" });
            lineIdsToProcess = new List<Guid> { request.DocumentLineId.Value };
        }
        else if (scope.Equals("PendingOnly", StringComparison.OrdinalIgnoreCase))
        {
            var allLineIds = await _context.TransactionDocumentLines.Select(l => l.Id).ToListAsync(ct);
            var reviewedSourceIds = await _context.Bookings
                .Where(b => b.SourceDocumentLineId != null && b.ReviewedAt != null)
                .Select(b => b.SourceDocumentLineId!.Value)
                .Distinct()
                .ToListAsync(ct);
            lineIdsToProcess = allLineIds.Where(id => !reviewedSourceIds.Contains(id)).ToList();
        }
        else if (scope.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            lineIdsToProcess = await _context.TransactionDocumentLines.Select(l => l.Id).ToListAsync(ct);
        }
        else
            return BadRequest(new { error = "Scope must be ThisBooking, PendingOnly, or All" });

        int processed = 0;
        int created = 0;
        var errors = new List<string>();
        foreach (var lineId in lineIdsToProcess)
        {
            var line = await _context.TransactionDocumentLines.Include(l => l.Document).FirstOrDefaultAsync(l => l.Id == lineId, ct);
            if (line == null) continue;
            var existing = await _context.Bookings.Include(b => b.Lines).FirstOrDefaultAsync(b => b.SourceDocumentLineId == lineId, ct);
            try
            {
                if (existing != null)
                {
                    // Add rule-derived line(s) to existing booking; do not replace existing lines.
                    await _bookingFromLineService.AddRuleLinesToExistingBookingAsync(existing, line, ct);
                    await _context.SaveChangesAsync(ct);
                    processed++;
                }
                else
                {
                    await _bookingFromLineService.CreateBookingForLineAsync(line, line.Document, null, null, ct);
                    await _context.SaveChangesAsync(ct);
                    processed++;
                    created++;
                }
            }
            catch (Exception ex)
            {
                errors.Add($"Line {lineId}: {ex.Message}");
            }
        }
        return Ok(new RecreateByScopeResult { Processed = processed, Created = created, Errors = errors.Count > 0 ? errors : null });
    }

    /// <summary>POST /api/bookings/{bookingId}/lines - Add a line to an existing booking.</summary>
    [HttpPost("{bookingId}/lines")]
    public async Task<ActionResult<BookingLineDto>> AddLine(
        string bookingId,
        [FromBody] AddBookingLineRequest request,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(bookingId, out var bookingIdParsed))
            return BadRequest(new { error = "Invalid booking ID format" });

        var booking = await _context.Bookings
            .Include(b => b.Lines)
            .ThenInclude(l => l.LedgerAccount)
            .FirstOrDefaultAsync(b => b.Id == bookingIdParsed, ct);
        if (booking == null)
            return NotFound(new { error = "Booking not found" });

        var ledgerExists = await _context.LedgerAccounts.AnyAsync(a => a.Id == request.LedgerAccountId, ct);
        if (!ledgerExists)
            return BadRequest(new { error = "Ledger account not found" });

        var nextLineNumber = booking.Lines.Count > 0 ? booking.Lines.Max(l => l.LineNumber) + 1 : 0;
        var line = new BookingLine
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            LineNumber = nextLineNumber,
            LedgerAccountId = request.LedgerAccountId,
            DebitAmount = request.DebitAmount,
            CreditAmount = request.CreditAmount,
            Currency = request.Currency ?? "EUR",
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
        };
        _context.BookingLines.Add(line);
        await _context.SaveChangesAsync(ct);
        await _context.Entry(line).Reference(l => l.LedgerAccount).LoadAsync(ct);

        var dto = new BookingLineDto
        {
            Id = line.Id,
            LineNumber = line.LineNumber,
            LedgerAccountId = line.LedgerAccountId,
            LedgerAccountCode = line.LedgerAccount?.Code,
            LedgerAccountName = line.LedgerAccount?.Name,
            DebitAmount = line.DebitAmount,
            CreditAmount = line.CreditAmount,
            Currency = line.Currency,
            Description = line.Description,
        };
        return Ok(dto);
    }
}

public class AddBookingLineRequest
{
    public int LedgerAccountId { get; set; }
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
    public string? Currency { get; set; }
    public string? Description { get; set; }
}

public class CreateBookingFromLineRequest
{
    public Guid DocumentLineId { get; set; }
    /// <summary>Ledger account for the "own" side (e.g. bank account). If null, only contra line is created (PoC).</summary>
    public int? OwnAccountLedgerId { get; set; }
    /// <summary>Ledger account for the contra side. If null, first matching BusinessRule is used.</summary>
    public int? ContraLedgerAccountId { get; set; }
}

public class RecreateByScopeRequest
{
    /// <summary>ThisBooking = single line (DocumentLineId required), PendingOnly = lines without reviewed booking, All = all lines.</summary>
    public string Scope { get; set; } = "";
    public Guid? DocumentLineId { get; set; }
}

public class RecreateByScopeResult
{
    public int Processed { get; set; }
    public int Created { get; set; }
    public List<string>? Errors { get; set; }
}

public class BookingWithLinesDto
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string Reference { get; set; } = "";
    public Guid? SourceDocumentLineId { get; set; }
    public DateTime DateCreated { get; set; }
    public string CreatedByUser { get; set; } = "";
    public bool RequiresReview { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public List<BookingLineDto> Lines { get; set; } = new();
}

public class BookingLineDto
{
    public Guid Id { get; set; }
    public int LineNumber { get; set; }
    public int LedgerAccountId { get; set; }
    public string? LedgerAccountCode { get; set; }
    public string? LedgerAccountName { get; set; }
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? Description { get; set; }
}
