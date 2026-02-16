using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BusinessRulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public BusinessRulesController(AppDbContext context) => _context = context;

    /// <summary>GET /api/businessrules - List all business rules (for auto-booking suggestions).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await _context.BusinessRules
            .Include(r => r.LedgerAccount)
            .Where(r => r.IsActive)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.MatchField,
                r.MatchOperator,
                r.MatchValue,
                r.LedgerAccountId,
                LedgerAccountName = r.LedgerAccount != null ? r.LedgerAccount.Name : null,
                r.SortOrder,
                r.IsActive,
            })
            .ToListAsync();
        return Ok(list);
    }

    /// <summary>POST /api/businessrules - Create a business rule.</summary>
    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateBusinessRuleRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });
        if (request.LedgerAccountId <= 0)
            return BadRequest(new { error = "LedgerAccountId is required" });
        var rule = new BusinessRule
        {
            Name = request.Name.Trim(),
            MatchField = string.IsNullOrWhiteSpace(request.MatchField) ? "ContraAccountName" : request.MatchField.Trim(),
            MatchOperator = string.IsNullOrWhiteSpace(request.MatchOperator) ? "Contains" : request.MatchOperator.Trim(),
            MatchValue = request.MatchValue?.Trim() ?? "",
            LedgerAccountId = request.LedgerAccountId,
            SortOrder = request.SortOrder,
            IsActive = true,
        };
        _context.BusinessRules.Add(rule);
        await _context.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetAll), new { id = rule.Id, rule.Name, rule.MatchField, rule.MatchOperator, rule.MatchValue, rule.LedgerAccountId, rule.SortOrder, rule.IsActive });
    }
}

public class CreateBusinessRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MatchField { get; set; }
    public string? MatchOperator { get; set; }
    public string? MatchValue { get; set; }
    public int LedgerAccountId { get; set; }
    public int SortOrder { get; set; }
}
