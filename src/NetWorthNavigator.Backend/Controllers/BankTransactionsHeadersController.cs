using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

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
}
