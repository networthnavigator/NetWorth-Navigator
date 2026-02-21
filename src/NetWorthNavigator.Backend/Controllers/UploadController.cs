using Microsoft.AspNetCore.Mvc;
using NetWorthNavigator.Backend.Models;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly CsvImportService _importService;

    public UploadController(CsvImportService importService) => _importService = importService;

    /// <summary>GET /api/upload/column-schema - Mappable columns for imported transaction lines</summary>
    [HttpGet("column-schema")]
    [ResponseCache(NoStore = true, Duration = 0)]
    public ActionResult<IEnumerable<object>> GetColumnSchema()
    {
        var schema = new[]
        {
            new { id = "Date", label = "Date" },
            new { id = "OwnAccount", label = "Own account" },
            new { id = "ContraAccount", label = "Counterparty account" },
            new { id = "ContraAccountName", label = "Counterparty name" },
            new { id = "ExternalId", label = "External ID (bank transaction ID, for deduplication)" },
            new { id = "Amount", label = "Amount" },
            new { id = "_AmountSign", label = "Debit/Credit" },
            new { id = "Description", label = "Description" },
            new { id = "BalanceAfter", label = "Balance after" },
            new { id = "Currency", label = "Currency" },
            new { id = "MovementType", label = "Movement type (code)" },
            new { id = "MovementTypeLabel", label = "Movement type (label)" },
            new { id = "Tag", label = "Tag" },
        };
        return Ok(schema);
    }

    /// <summary>GET /api/upload/banks - All banks with upload support</summary>
    [HttpGet("banks")]
    [ResponseCache(NoStore = true, Duration = 0)]
    public ActionResult<IEnumerable<object>> GetBanks()
    {
        return Ok(CsvImportService.Banks);
    }

    /// <summary>POST /api/upload/parse-headers - Parse CSV headers from file (for new config)</summary>
    [HttpPost("parse-headers")]
    [RequestSizeLimit(1024 * 1024)]
    public async Task<ActionResult<object>> ParseHeaders([FromForm] IFormFile? file, [FromForm] string? delimiter, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });
        await using var stream = file.OpenReadStream();
        var (headers, usedDelimiter) = _importService.ParseHeaders(stream, delimiter ?? ";");
        return Ok(new { headers, delimiter = usedDelimiter });
    }

    /// <summary>POST /api/upload/configurations - Create new upload configuration</summary>
    [HttpPost("configurations")]
    public async Task<ActionResult<UploadConfigurationDto>> CreateConfiguration([FromBody] UploadConfigurationDto config, CancellationToken ct)
    {
        try
        {
            var created = await _importService.SaveConfigurationAsync(config, ct);
            return Ok(created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>GET /api/upload/configurations?bankId=ing - Configurations for a bank</summary>
    [HttpGet("configurations")]
    public ActionResult<IEnumerable<object>> GetConfigurations([FromQuery] string bankId)
    {
        if (string.IsNullOrWhiteSpace(bankId))
            return BadRequest(new { error = "bankId is required" });
        var configs = _importService.GetConfigurationsByBank(bankId);
        return Ok(configs);
    }

    /// <summary>DELETE /api/upload/configurations/{id} - Delete a file type configuration</summary>
    [HttpDelete("configurations/{id}")]
    public async Task<ActionResult> DeleteConfiguration([FromRoute] string id, CancellationToken ct)
    {
        var removed = await _importService.DeleteConfigurationAsync(id, ct);
        if (!removed)
            return NotFound(new { error = "Configuration not found" });
        return NoContent();
    }

    /// <summary>POST /api/upload/detect - Detect configuration from CSV file (read first line only)</summary>
    [HttpPost("detect")]
    [RequestSizeLimit(1024 * 1024)] // 1MB
    public async Task<ActionResult<object>> Detect([FromForm] IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });
        await using var stream = file.OpenReadStream();
        var configId = _importService.DetectConfiguration(stream);
        if (configId == null)
            return Ok(new { detected = false, configurationId = (string?)null });
        var config = _importService.GetConfigurationById(configId!);
        if (config == null)
            return Ok(new { detected = false, configurationId = (string?)null });
        return Ok(new { detected = true, configurationId = configId, configuration = config });
    }

    /// <summary>POST /api/upload/preview - Preview import: return counts and line list without saving</summary>
    [HttpPost("preview")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
    public async Task<ActionResult<object>> Preview(
        [FromForm] IFormFile? file,
        [FromForm] string configurationId,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });
        if (string.IsNullOrWhiteSpace(configurationId))
            return BadRequest(new { error = "configurationId is required" });
        try
        {
            await using var stream = file.OpenReadStream();
            var (readyForImport, toSkip, lines, ownAccountsInFile) = await _importService.PreviewAsync(
                stream, configurationId, ct);
            return Ok(new
            {
                readyForImport,
                toSkip,
                lines,
                ownAccountsInFile = ownAccountsInFile.ToList(),
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/upload/import - Import CSV with given configuration</summary>
    [HttpPost("import")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
    public async Task<ActionResult<object>> Import(
        [FromForm] IFormFile? file,
        [FromForm] string configurationId,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided" });
        if (string.IsNullOrWhiteSpace(configurationId))
            return BadRequest(new { error = "configurationId is required" });
        try
        {
            await using var stream = file.OpenReadStream();
            var (imported, skipped, ownAccountsInFile) = await _importService.ImportAsync(
                stream, configurationId, file.FileName, ct);
            return Ok(new { imported, skipped, ownAccountsInFile = ownAccountsInFile.ToList() });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/upload/seed - Import file type configurations from Seeds/upload-configurations-seed.json</summary>
    [HttpPost("seed")]
    public async Task<ActionResult<object>> Seed(CancellationToken ct)
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "upload-configurations-seed.json");
            if (!System.IO.File.Exists(seedPath))
                return NotFound(new { error = "Seed file not found" });
            var json = await System.IO.File.ReadAllTextAsync(seedPath, ct);
            var added = await _importService.ImportSeedAsync(json, ct);
            return Ok(new { configurationsAdded = added });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/upload/seed/update-file - Update seed file with current custom configurations</summary>
    [HttpPost("seed/update-file")]
    public ActionResult<object> UpdateSeedFile()
    {
        try
        {
            var seedPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "upload-configurations-seed.json");
            var json = _importService.ExportCustomConfigurationsToJson();
            System.IO.File.WriteAllText(seedPath, json);
            return Ok(new { message = "Seed file updated successfully", path = seedPath });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
