using Microsoft.AspNetCore.Mvc;
using NetWorthNavigator.Backend.Application.DTOs;
using NetWorthNavigator.Backend.Application.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/accounts")]
public class AccountsController : ControllerBase
{
    private readonly IAccountsApplicationService _service;

    public AccountsController(IAccountsApplicationService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BalanceSheetAccountDto>>> GetAll(CancellationToken ct)
    {
        var list = await _service.GetAllAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<BalanceSheetAccountDto>> Create([FromBody] BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct)
    {
        var result = await _service.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BalanceSheetAccountDto>> Update(int id, [FromBody] BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(id, dto, ct);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (!await _service.DeleteAsync(id, ct)) return NotFound();
        return NoContent();
    }
}
