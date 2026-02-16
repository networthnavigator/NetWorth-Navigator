using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BankTransactionsHeadersController : ControllerBase
{
    private readonly AppDbContext _context;

    public BankTransactionsHeadersController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/banktransactionheaders - Returns all transaction headers
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BankTransactionsHeader>>> GetHeaders()
    {
        var list = await _context.BankTransactionsHeaders
            .OrderByDescending(h => h.Date)
            .ThenByDescending(h => h.DateCreated)
            .ToListAsync();
        return Ok(list);
    }

    /// <summary>
    /// DELETE /api/banktransactionsheaders - Deletes all transaction headers (empties the table).
    /// </summary>
    [HttpDelete]
    public async Task<ActionResult> DeleteAll()
    {
        var count = await _context.BankTransactionsHeaders.ExecuteDeleteAsync();
        return Ok(new { deleted = count });
    }

    /// <summary>
    /// GET /api/banktransactionsheaders/own-accounts - Returns distinct OwnAccount values from imported transactions (for adding as balance sheet accounts).
    /// </summary>
    [HttpGet("own-accounts")]
    public async Task<ActionResult<IEnumerable<string>>> GetOwnAccounts()
    {
        var accounts = await _context.BankTransactionsHeaders
            .Select(h => h.OwnAccount)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct()
            .OrderBy(s => s)
            .ToListAsync();
        return Ok(accounts);
    }
}
