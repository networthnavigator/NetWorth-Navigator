using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/investment-accounts")]
public class InvestmentAccountsController : ControllerBase
{
    private readonly AppDbContext _context;

    public InvestmentAccountsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await _context.InvestmentAccounts
            .AsNoTracking()
            .Include(a => a.LedgerAccount)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.CurrentBalance,
                a.Currency,
                a.SortOrder,
                a.LedgerAccountId,
                LedgerAccountName = a.LedgerAccount != null ? $"{a.LedgerAccount.Code} {a.LedgerAccount.Name}" : (string?)null,
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] InvestmentAccountCreateUpdateDto item)
    {
        var maxOrder = await _context.InvestmentAccounts.Select(a => (int?)a.SortOrder).MaxAsync() ?? 0;
        var entity = new InvestmentAccount
        {
            Name = item.Name ?? "",
            CurrentBalance = item.CurrentBalance,
            Currency = item.Currency ?? "EUR",
            SortOrder = maxOrder + 1,
            LedgerAccountId = item.LedgerAccountId > 0 ? item.LedgerAccountId : null,
        };
        _context.InvestmentAccounts.Add(entity);
        await _context.SaveChangesAsync();
        await _context.Entry(entity).Reference(a => a.LedgerAccount).LoadAsync();
        return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, Shape(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<object>> Update(int id, [FromBody] InvestmentAccountCreateUpdateDto item)
    {
        var existing = await _context.InvestmentAccounts.FindAsync(id);
        if (existing == null) return NotFound();
        existing.Name = item.Name ?? existing.Name;
        existing.CurrentBalance = item.CurrentBalance;
        existing.Currency = item.Currency ?? "EUR";
        existing.LedgerAccountId = item.LedgerAccountId.HasValue && item.LedgerAccountId.Value > 0 ? item.LedgerAccountId : null;
        await _context.SaveChangesAsync();
        await _context.Entry(existing).Reference(a => a.LedgerAccount).LoadAsync();
        return Ok(Shape(existing));
    }

    private static object Shape(InvestmentAccount a) => new
    {
        a.Id,
        a.Name,
        a.CurrentBalance,
        a.Currency,
        a.SortOrder,
        a.LedgerAccountId,
        LedgerAccountName = a.LedgerAccount != null ? $"{a.LedgerAccount.Code} {a.LedgerAccount.Name}" : (string?)null,
    };

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.InvestmentAccounts.FindAsync(id);
        if (existing == null) return NotFound();
        _context.InvestmentAccounts.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class InvestmentAccountCreateUpdateDto
{
    public string? Name { get; set; }
    public decimal CurrentBalance { get; set; }
    public string? Currency { get; set; }
    public int? LedgerAccountId { get; set; }
}
