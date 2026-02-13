using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/accounts")]
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AccountsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BalanceSheetAccount>>> GetAll() =>
        Ok(await _context.BalanceSheetAccounts.AsNoTracking().OrderBy(a => a.SortOrder).ThenBy(a => a.Name).ToListAsync());

    [HttpPost]
    public async Task<ActionResult<BalanceSheetAccount>> Create([FromBody] BalanceSheetAccount item)
    {
        item.Id = 0;
        var maxOrder = await _context.BalanceSheetAccounts.Select(a => (int?)a.SortOrder).MaxAsync() ?? 0;
        item.SortOrder = maxOrder + 1;
        _context.BalanceSheetAccounts.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = item.Id }, item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BalanceSheetAccount>> Update(int id, [FromBody] BalanceSheetAccount item)
    {
        if (id != item.Id) return BadRequest();
        var existing = await _context.BalanceSheetAccounts.FindAsync(id);
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
        var existing = await _context.BalanceSheetAccounts.FindAsync(id);
        if (existing == null) return NotFound();
        _context.BalanceSheetAccounts.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
