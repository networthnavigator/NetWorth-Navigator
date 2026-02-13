using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/properties/{propertyId:int}/valuations")]
public class PropertyValuationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PropertyValuationsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PropertyValuation>>> GetAll(int propertyId) =>
        Ok(await _context.PropertyValuations
            .AsNoTracking()
            .Where(v => v.PropertyId == propertyId)
            .OrderBy(v => v.ValuationDate)
            .ThenBy(v => v.SortOrder)
            .ToListAsync());

    [HttpPost]
    public async Task<ActionResult<PropertyValuation>> Create(int propertyId, [FromBody] PropertyValuation item)
    {
        var propertyExists = await _context.Properties.AnyAsync(p => p.Id == propertyId);
        if (!propertyExists) return NotFound(new { error = "Property not found" });

        item.Id = 0;
        item.PropertyId = propertyId;
        var maxOrder = await _context.PropertyValuations
            .Where(v => v.PropertyId == propertyId)
            .Select(v => (int?)v.SortOrder)
            .MaxAsync() ?? 0;
        item.SortOrder = maxOrder + 1;
        _context.PropertyValuations.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { propertyId }, item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PropertyValuation>> Update(int propertyId, int id, [FromBody] PropertyValuation item)
    {
        if (id != item.Id) return BadRequest();
        var existing = await _context.PropertyValuations
            .FirstOrDefaultAsync(v => v.Id == id && v.PropertyId == propertyId);
        if (existing == null) return NotFound();
        existing.ValuationDate = item.ValuationDate;
        existing.Value = item.Value;
        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int propertyId, int id)
    {
        var existing = await _context.PropertyValuations
            .FirstOrDefaultAsync(v => v.Id == id && v.PropertyId == propertyId);
        if (existing == null) return NotFound();
        _context.PropertyValuations.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
