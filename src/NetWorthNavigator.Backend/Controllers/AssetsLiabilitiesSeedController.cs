using System.IO;
using Microsoft.AspNetCore.Mvc;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/seed")]
public class AssetsLiabilitiesSeedController : ControllerBase
{
    private readonly AssetsLiabilitiesSeedService _seedService;

    public AssetsLiabilitiesSeedController(AssetsLiabilitiesSeedService seedService) => _seedService = seedService;

    /// <summary>POST /api/assets-liabilities/seed - Import seed data from Seeds/assets-liabilities-seed.json</summary>
    [HttpPost]
    public async Task<ActionResult<AssetsLiabilitiesSeedResult>> Seed()
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "assets-liabilities-seed.json");
            if (!System.IO.File.Exists(seedPath))
            {
                return NotFound(new { error = "Seed file not found" });
            }

            var json = await System.IO.File.ReadAllTextAsync(seedPath);
            var result = await _seedService.ImportFromJsonAsync(json);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>GET /api/assets-liabilities/seed/export - Export current data as JSON</summary>
    [HttpGet("export")]
    public async Task<ActionResult<string>> Export()
    {
        try
        {
            var json = await _seedService.ExportToJsonAsync();
            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/assets-liabilities/seed/update-file - Update seed file with current database data</summary>
    [HttpPost("update-file")]
    public async Task<ActionResult<object>> UpdateSeedFile()
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "assets-liabilities-seed.json");
            var json = await _seedService.ExportToJsonAsync();
            await System.IO.File.WriteAllTextAsync(seedPath, json);
            return Ok(new { message = "Seed file updated successfully", path = seedPath });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
