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

    /// <summary>GET /api/upload/column-schema - Mappable columns from BankTransactionsHeaders table</summary>
    [HttpGet("column-schema")]
    [ResponseCache(NoStore = true, Duration = 0)]
    public ActionResult<IEnumerable<object>> GetColumnSchema()
    {
        var schema = new[]
        {
            new { id = "Date", label = "Date" },
            new { id = "OwnAccount", label = "Account number" },
            new { id = "ContraAccount", label = "Counterparty" },
            new { id = "Amount", label = "Amount" },
            new { id = "_AmountSign", label = "Debit/Credit" },
            new { id = "Description", label = "Description" },
            new { id = "BalanceAfter", label = "Balance after" },
            new { id = "Currency", label = "Currency" },
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
            var (imported, skipped) = await _importService.ImportAsync(
                stream, configurationId, file.FileName, ct);
            return Ok(new { imported, skipped });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
