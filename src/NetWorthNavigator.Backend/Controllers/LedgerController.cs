using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Application.DTOs;
using NetWorthNavigator.Backend.Application.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/ledger")]
public class LedgerController : ControllerBase
{
    private readonly ILedgerApplicationService _service;

    public LedgerController(ILedgerApplicationService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LedgerAccountDto>>> GetAll(CancellationToken ct)
    {
        var list = await _service.GetAllAsync(ct);
        return Ok(list);
    }

    [HttpGet("assets")]
    public async Task<ActionResult<IEnumerable<LedgerAccountDto>>> GetAssets(CancellationToken ct)
    {
        var list = await _service.GetAssetsAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<LedgerAccountDto>> Create([FromBody] LedgerAccountCreateDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<LedgerAccountDto>> Update(int id, [FromBody] LedgerAccountUpdateDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            if (result == null) return NotFound();
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            if (!await _service.DeleteAsync(id, ct)) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (DbUpdateException)
        {
            return Conflict(new { error = "Cannot delete this ledger account: it is still in use (e.g. by balance sheet accounts, bookings or business rules)." });
        }
    }
}
