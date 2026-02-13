using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Models;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/ledger")]
public class LedgerController : ControllerBase
{
    private readonly AppDbContext _context;

    public LedgerController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>GET all ledger accounts, ordered by structure then sort order.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LedgerAccountDto>>> GetAll()
    {
        var items = await _context.LedgerAccounts
            .Include(l => l.AccountStructure)
            .AsNoTracking()
            .OrderBy(l => l.AccountStructure!.SortOrder)
            .ThenBy(l => l.SortOrder)
            .ThenBy(l => l.Code)
            .ToListAsync();
        return Ok(items.Select(MapToDto));
    }

    /// <summary>POST - Create ledger account.</summary>
    [HttpPost]
    public async Task<ActionResult<LedgerAccountDto>> Create([FromBody] LedgerAccountCreateDto dto)
    {
        var structure = await _context.AccountStructures.FindAsync(dto.AccountStructureId);
        if (structure == null)
            return BadRequest(new { error = "Invalid account structure id." });
        if (structure.Level < 3)
            return BadRequest(new { error = "Account structure must be an account class (level 3 or deeper)." });

        var maxSort = await _context.LedgerAccounts
            .Where(l => l.AccountStructureId == dto.AccountStructureId)
            .Select(l => (int?)l.SortOrder)
            .MaxAsync() ?? 0;

        var entity = new LedgerAccount
        {
            AccountStructureId = dto.AccountStructureId,
            Code = dto.Code.Trim(),
            Name = dto.Name.Trim(),
            SortOrder = maxSort + 1,
        };
        _context.LedgerAccounts.Add(entity);
        await _context.SaveChangesAsync();
        await _context.Entry(entity).Reference(e => e.AccountStructure).LoadAsync();
        return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, MapToDto(entity));
    }

    /// <summary>PUT - Update ledger account.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<LedgerAccountDto>> Update(int id, [FromBody] LedgerAccountUpdateDto dto)
    {
        var entity = await _context.LedgerAccounts.FindAsync(id);
        if (entity == null)
            return NotFound();

        if (dto.AccountStructureId.HasValue)
        {
            var structure = await _context.AccountStructures.FindAsync(dto.AccountStructureId.Value);
            if (structure == null || structure.Level < 3)
                return BadRequest(new { error = "Invalid account structure id." });
            entity.AccountStructureId = dto.AccountStructureId.Value;
        }
        if (dto.Code != null) entity.Code = dto.Code.Trim();
        if (dto.Name != null) entity.Name = dto.Name.Trim();
        if (dto.SortOrder.HasValue) entity.SortOrder = dto.SortOrder.Value;

        await _context.SaveChangesAsync();
        await _context.Entry(entity).Reference(e => e.AccountStructure).LoadAsync();
        return Ok(MapToDto(entity));
    }

    /// <summary>DELETE ledger account.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _context.LedgerAccounts.FindAsync(id);
        if (entity == null)
            return NotFound();
        _context.LedgerAccounts.Remove(entity);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static LedgerAccountDto MapToDto(LedgerAccount l)
    {
        return new LedgerAccountDto
        {
            Id = l.Id,
            AccountStructureId = l.AccountStructureId,
            AccountStructureName = l.AccountStructure?.Name ?? "",
            Code = l.Code,
            Name = l.Name,
            SortOrder = l.SortOrder,
        };
    }
}

public class LedgerAccountDto
{
    public int Id { get; set; }
    public int AccountStructureId { get; set; }
    public string AccountStructureName { get; set; } = "";
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
}

public class LedgerAccountCreateDto
{
    public int AccountStructureId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
}

public class LedgerAccountUpdateDto
{
    public int? AccountStructureId { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    public int? SortOrder { get; set; }
}
