using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/properties")]
public class PropertiesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PropertiesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Property>>> GetAll() =>
        Ok(await _context.Properties.AsNoTracking().OrderBy(p => p.SortOrder).ThenBy(p => p.Name).ToListAsync());

    [HttpPost]
    public async Task<ActionResult<Property>> Create([FromBody] Property item)
    {
        item.Id = 0;
        var maxOrder = await _context.Properties.Select(p => (int?)p.SortOrder).MaxAsync() ?? 0;
        item.SortOrder = maxOrder + 1;
        _context.Properties.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = item.Id }, item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Property>> Update(int id, [FromBody] Property item)
    {
        if (id != item.Id) return BadRequest();
        var existing = await _context.Properties.FindAsync(id);
        if (existing == null) return NotFound();
        existing.Name = item.Name;
        existing.PurchaseValue = item.PurchaseValue;
        existing.PurchaseDate = item.PurchaseDate;
        existing.Currency = item.Currency ?? "EUR";
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.Properties.FindAsync(id);
        if (existing == null) return NotFound();
        _context.Properties.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
