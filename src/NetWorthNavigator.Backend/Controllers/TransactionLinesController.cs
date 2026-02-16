using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

/// <summary>
/// API for transaction document lines (imports and later manual entry: bank, credit card, brokerage, crypto, cash).
/// Header/line model: each line belongs to a TransactionDocument.
/// </summary>
[ApiController]
[Route("api/transaction-lines")]
public class TransactionLinesController : ControllerBase
{
    private readonly AppDbContext _context;

    public TransactionLinesController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>GET - Returns all transaction document lines (any source).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransactionLineDto>>> GetLines()
    {
        var list = await _context.TransactionDocumentLines
            .Include(l => l.Document)
            .OrderByDescending(l => l.Date)
            .ThenByDescending(l => l.DateCreated)
            .ToListAsync();
        var dtos = list.Select(ToDto).ToList();
        return Ok(dtos);
    }

    /// <summary>DELETE - Deletes all transaction documents and their lines.</summary>
    [HttpDelete]
    public async Task<ActionResult> DeleteAll()
    {
        var lineCount = await _context.TransactionDocumentLines.ExecuteDeleteAsync();
        var docCount = await _context.TransactionDocuments.ExecuteDeleteAsync();
        return Ok(new { deleted = lineCount, deletedLines = lineCount, deletedDocuments = docCount });
    }

    /// <summary>GET own-accounts - Distinct OwnAccount values from document lines (for balance sheet accounts).</summary>
    [HttpGet("own-accounts")]
    public async Task<ActionResult<IEnumerable<string>>> GetOwnAccounts()
    {
        var accounts = await _context.TransactionDocumentLines
            .Select(l => l.OwnAccount)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();
        return Ok(accounts);
    }

    private static TransactionLineDto ToDto(TransactionDocumentLine l)
    {
        return new TransactionLineDto
        {
            Id = l.Id,
            DocumentId = l.DocumentId,
            LineNumber = l.LineNumber,
            Date = l.Date,
            OwnAccount = l.OwnAccount,
            ContraAccount = l.ContraAccount,
            ContraAccountName = l.ContraAccountName,
            Amount = l.Amount,
            Currency = l.Currency,
            MovementType = l.MovementType,
            MovementTypeLabel = l.MovementTypeLabel,
            Description = l.Description,
            BalanceAfter = l.BalanceAfter,
            OriginalCsvLine = l.OriginalCsvLine,
            ExternalId = l.ExternalId,
            Hash = l.Hash,
            DateCreated = l.DateCreated,
            DateUpdated = l.DateUpdated,
            CreatedByUser = l.CreatedByUser,
            CreatedByProcess = l.CreatedByProcess,
            SourceName = l.Document?.SourceName,
            Status = l.Status,
            UserComments = l.UserComments,
            Tag = l.Tag,
        };
    }
}
