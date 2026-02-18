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

    /// <summary>GET /api/businessrules - List all booking rules (for manage page; only active ones are used when creating bookings).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await _context.BusinessRules
            .Include(r => r.LedgerAccount)
            .Include(r => r.SecondLedgerAccount)
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
                LedgerAccountCode = r.LedgerAccount != null ? r.LedgerAccount.Code : null,
                LedgerAccountName = r.LedgerAccount != null ? r.LedgerAccount.Name : null,
                r.SecondLedgerAccountId,
                SecondLedgerAccountCode = r.SecondLedgerAccount != null ? r.SecondLedgerAccount.Code : null,
                SecondLedgerAccountName = r.SecondLedgerAccount != null ? r.SecondLedgerAccount.Name : null,
                r.SortOrder,
                r.IsActive,
                r.RequiresReview,
            })
            .ToListAsync();
        return Ok(list);
    }

    /// <summary>PUT /api/businessrules/{id} - Update a booking rule.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<object>> Update(int id, [FromBody] UpdateBusinessRuleRequest request, CancellationToken ct = default)
    {
        var rule = await _context.BusinessRules.FindAsync([id], ct);
        if (rule == null)
            return NotFound(new { error = "Rule not found" });
        if (request.Name != null)
            rule.Name = request.Name.Trim();
        if (request.MatchField != null)
            rule.MatchField = request.MatchField.Trim();
        if (request.MatchOperator != null)
            rule.MatchOperator = request.MatchOperator.Trim();
        if (request.MatchValue != null)
            rule.MatchValue = request.MatchValue.Trim();
        if (request.LedgerAccountId.HasValue && request.LedgerAccountId.Value > 0)
            rule.LedgerAccountId = request.LedgerAccountId.Value;
        if (request.SortOrder.HasValue)
            rule.SortOrder = request.SortOrder.Value;
        if (request.IsActive.HasValue)
            rule.IsActive = request.IsActive.Value;
        if (request.RequiresReview.HasValue)
            rule.RequiresReview = request.RequiresReview.Value;
        if (request.SecondLedgerAccountId.HasValue)
            rule.SecondLedgerAccountId = request.SecondLedgerAccountId.Value > 0 ? request.SecondLedgerAccountId.Value : null;
        await _context.SaveChangesAsync(ct);
        await _context.Entry(rule).Reference(r => r.LedgerAccount).LoadAsync(ct);
        await _context.Entry(rule).Reference(r => r.SecondLedgerAccount).LoadAsync(ct);
        return Ok(new { rule.Id, rule.Name, rule.MatchField, rule.MatchOperator, rule.MatchValue, rule.LedgerAccountId, LedgerAccountName = rule.LedgerAccount?.Name, rule.SecondLedgerAccountId, SecondLedgerAccountName = rule.SecondLedgerAccount?.Name, rule.SortOrder, rule.IsActive, rule.RequiresReview });
    }

    /// <summary>DELETE /api/businessrules/{id} - Delete a booking rule.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var rule = await _context.BusinessRules.FindAsync([id], ct);
        if (rule == null)
            return NotFound(new { error = "Rule not found" });
        _context.BusinessRules.Remove(rule);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>POST /api/businessrules - Create a booking rule.</summary>
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
            SecondLedgerAccountId = request.SecondLedgerAccountId > 0 ? request.SecondLedgerAccountId : null,
            SortOrder = request.SortOrder,
            IsActive = true,
            RequiresReview = request.RequiresReview,
        };
        _context.BusinessRules.Add(rule);
        await _context.SaveChangesAsync(ct);
        await _context.Entry(rule).Reference(r => r.LedgerAccount).LoadAsync(ct);
        await _context.Entry(rule).Reference(r => r.SecondLedgerAccount).LoadAsync(ct);
        return CreatedAtAction(nameof(GetAll), new { id = rule.Id, rule.Name, rule.MatchField, rule.MatchOperator, rule.MatchValue, rule.LedgerAccountId, LedgerAccountName = rule.LedgerAccount?.Name, rule.SecondLedgerAccountId, SecondLedgerAccountName = rule.SecondLedgerAccount?.Name, rule.SortOrder, rule.IsActive, rule.RequiresReview });
    }
}

public class CreateBusinessRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MatchField { get; set; }
    public string? MatchOperator { get; set; }
    public string? MatchValue { get; set; }
    public int LedgerAccountId { get; set; }
    /// <summary>Optional second ledger (e.g. 0773); when set, two contra lines with amount 0 are created.</summary>
    public int? SecondLedgerAccountId { get; set; }
    public int SortOrder { get; set; }
    /// <summary>If true, bookings created with this rule need user review before approved. Default true for contra rules.</summary>
    public bool RequiresReview { get; set; } = true;
}

public class UpdateBusinessRuleRequest
{
    public string? Name { get; set; }
    public string? MatchField { get; set; }
    public string? MatchOperator { get; set; }
    public string? MatchValue { get; set; }
    public int? LedgerAccountId { get; set; }
    public int? SecondLedgerAccountId { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
    public bool? RequiresReview { get; set; }
}
