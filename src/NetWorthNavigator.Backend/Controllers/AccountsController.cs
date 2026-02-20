using Microsoft.AspNetCore.Mvc;
using NetWorthNavigator.Backend.Application.DTOs;
using NetWorthNavigator.Backend.Application.Services;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/accounts")]
public class AccountsController : ControllerBase
{
    private readonly IAccountsApplicationService _service;
    private readonly OwnAccountRuleSyncService _ownAccountRuleSync;

    public AccountsController(IAccountsApplicationService service, OwnAccountRuleSyncService ownAccountRuleSync)
    {
        _service = service;
        _ownAccountRuleSync = ownAccountRuleSync;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BalanceSheetAccountDto>>> GetAll(CancellationToken ct)
    {
        var list = await _service.GetAllAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<BalanceSheetAccountDto>> Create([FromBody] BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(dto, ct);
            await _ownAccountRuleSync.EnsureRuleForBalanceSheetAccountAsync(result.Id, ct);
            return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BalanceSheetAccountDto>> Update(int id, [FromBody] BalanceSheetAccountCreateUpdateDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            if (result == null) return NotFound();
            await _ownAccountRuleSync.EnsureRuleForBalanceSheetAccountAsync(id, ct);
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
        if (!await _service.DeleteAsync(id, ct)) return NotFound();
        return NoContent();
    }
}
