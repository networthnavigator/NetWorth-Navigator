using System.IO;
using Microsoft.AspNetCore.Mvc;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/chart-of-accounts/seed")]
public class ChartOfAccountsSeedController : ControllerBase
{
    private readonly LedgerSeedService _ledgerSeedService;

    public ChartOfAccountsSeedController(LedgerSeedService ledgerSeedService) => _ledgerSeedService = ledgerSeedService;

    /// <summary>POST /api/chart-of-accounts/seed - Import ledger accounts from Seeds/ledger-accounts-seed.json</summary>
    [HttpPost]
    public async Task<ActionResult<ChartOfAccountsSeedResult>> Seed()
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "ledger-accounts-seed.json");
            if (!System.IO.File.Exists(seedPath))
                return NotFound(new { error = "Seed file not found" });

            var json = await System.IO.File.ReadAllTextAsync(seedPath);
            var count = await _ledgerSeedService.ImportFromJsonAsync(json);
            return Ok(new ChartOfAccountsSeedResult { LedgerAccountsAdded = count });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/chart-of-accounts/seed/update-file - Update seed file with current ledger accounts</summary>
    [HttpPost("update-file")]
    public async Task<ActionResult<object>> UpdateSeedFile()
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "ledger-accounts-seed.json");
            var json = await _ledgerSeedService.ExportToJsonAsync();
            await System.IO.File.WriteAllTextAsync(seedPath, json);
            return Ok(new { message = "Seed file updated successfully", path = seedPath });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public class ChartOfAccountsSeedResult
{
    public int LedgerAccountsAdded { get; set; }
}
