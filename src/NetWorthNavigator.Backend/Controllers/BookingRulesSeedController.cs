using System.IO;
using Microsoft.AspNetCore.Mvc;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/businessrules/seed")]
public class BookingRulesSeedController : ControllerBase
{
    private const string SeedFileName = "booking-rules-seed.json";
    private readonly BookingRulesSeedService _seedService;

    public BookingRulesSeedController(BookingRulesSeedService seedService) => _seedService = seedService;

    /// <summary>POST /api/businessrules/seed - Import rules from Data/Seeds/booking-rules-seed.json (adds to existing; skips duplicates).</summary>
    [HttpPost]
    public async Task<ActionResult<BookingRulesSeedResult>> Seed(CancellationToken ct = default)
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", SeedFileName);
            if (!System.IO.File.Exists(seedPath))
                return NotFound(new { error = "Seed file not found" });

            var json = await System.IO.File.ReadAllTextAsync(seedPath, ct);
            var result = await _seedService.ImportFromJsonAsync(json, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/businessrules/seed/update-file - Update seed file with current rules.</summary>
    [HttpPost("update-file")]
    public async Task<ActionResult<object>> UpdateSeedFile(CancellationToken ct = default)
    {
        try
        {
            var seedDir = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds");
            Directory.CreateDirectory(seedDir);
            var seedPath = Path.Combine(seedDir, SeedFileName);
            var json = await _seedService.ExportToJsonAsync(ct);
            await System.IO.File.WriteAllTextAsync(seedPath, json, ct);
            return Ok(new { message = "Seed file updated successfully", path = seedPath });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
