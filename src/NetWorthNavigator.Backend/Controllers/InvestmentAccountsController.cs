using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/investment-accounts")]
public class InvestmentAccountsController : ControllerBase
{
    private readonly AppDbContext _context;

    public InvestmentAccountsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvestmentAccount>>> GetAll() =>
        Ok(await _context.InvestmentAccounts.AsNoTracking().OrderBy(a => a.SortOrder).ThenBy(a => a.Name).ToListAsync());

    [HttpPost]
    public async Task<ActionResult<InvestmentAccount>> Create([FromBody] InvestmentAccount item)
    {
        item.Id = 0;
        var maxOrder = await _context.InvestmentAccounts.Select(a => (int?)a.SortOrder).MaxAsync() ?? 0;
        item.SortOrder = maxOrder + 1;
        _context.InvestmentAccounts.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = item.Id }, item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<InvestmentAccount>> Update(int id, [FromBody] InvestmentAccount item)
    {
        if (id != item.Id) return BadRequest();
        var existing = await _context.InvestmentAccounts.FindAsync(id);
        if (existing == null) return NotFound();
        existing.Name = item.Name;
        existing.CurrentBalance = item.CurrentBalance;
        existing.Currency = item.Currency ?? "EUR";
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

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
