using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain;
using NetWorthNavigator.Backend.Domain.Entities;
using NetWorthNavigator.Backend.Services;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BusinessRulesController : ControllerBase
{
    private readonly AppDbContext _context;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public BusinessRulesController(AppDbContext context) => _context = context;

    /// <summary>GET /api/businessrules - List all booking rules (for manage page; only active ones are used when creating bookings). Returns criteria array and conflictRuleIds (other rules that share at least one criterion).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await _context.BusinessRules
            .Include(r => r.LedgerAccount)
            .Include(r => r.SecondLedgerAccount)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .ToListAsync();

        var conflictMap = BuildConflictMap(list);

        var result = list.Select(r =>
        {
            var criteria = BusinessRuleCriteria.GetCriteria(r).Select(c => new { matchField = c.MatchField, matchOperator = c.MatchOperator, matchValue = c.MatchValue }).ToList();
            var conflictRuleIds = conflictMap.TryGetValue(r.Id, out var ids) ? ids : Array.Empty<int>();
            return (object)new
            {
                r.Id,
                r.Name,
                r.MatchField,
                r.MatchOperator,
                r.MatchValue,
                criteria,
                conflictRuleIds,
                r.LedgerAccountId,
                LedgerAccountCode = r.LedgerAccount?.Code,
                LedgerAccountName = r.LedgerAccount?.Name,
                r.SecondLedgerAccountId,
                SecondLedgerAccountCode = r.SecondLedgerAccount?.Code,
                SecondLedgerAccountName = r.SecondLedgerAccount?.Name,
                r.SortOrder,
                r.IsActive,
                r.RequiresReview,
                r.IsSystemGenerated,
            };
        }).ToList();
        return Ok(result);
    }

    /// <summary>For each rule id, returns set of other rule ids that share at least one criterion. System-generated rules are excluded from conflict detection (they never get or cause conflicts).</summary>
    private static Dictionary<int, int[]> BuildConflictMap(List<BusinessRule> rules)
    {
        var editableRules = rules.Where(r => !r.IsSystemGenerated).ToList();
        var keyToRuleIds = new Dictionary<string, HashSet<int>>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in editableRules)
        {
            var criteria = BusinessRuleCriteria.GetCriteria(r);
            foreach (var c in criteria)
            {
                var key = BusinessRuleCriteria.CriterionKey(c.MatchField, c.MatchOperator, c.MatchValue);
                if (!keyToRuleIds.TryGetValue(key, out var set))
                {
                    set = new HashSet<int>();
                    keyToRuleIds[key] = set;
                }
                set.Add(r.Id);
            }
        }
        var conflictMap = new Dictionary<int, int[]>();
        foreach (var r in rules)
        {
            if (r.IsSystemGenerated)
            {
                conflictMap[r.Id] = Array.Empty<int>();
                continue;
            }
            var criteria = BusinessRuleCriteria.GetCriteria(r);
            var otherIds = new HashSet<int>();
            foreach (var c in criteria)
            {
                var key = BusinessRuleCriteria.CriterionKey(c.MatchField, c.MatchOperator, c.MatchValue);
                if (keyToRuleIds.TryGetValue(key, out var set))
                {
                    foreach (var id in set)
                        if (id != r.Id)
                            otherIds.Add(id);
                }
            }
            conflictMap[r.Id] = otherIds.ToArray();
        }
        return conflictMap;
    }

    /// <summary>GET /api/businessrules/{id}/matching-bookings - Bookings whose source transaction line matches this rule. Header data only (like Bookings page columns).</summary>
    [HttpGet("{id:int}/matching-bookings")]
    public async Task<ActionResult<IEnumerable<RuleMatchingBookingDto>>> GetMatchingBookings(int id, CancellationToken ct = default)
    {
        var rule = await _context.BusinessRules.FindAsync([id], ct);
        if (rule == null)
            return NotFound(new { error = "Rule not found" });

        var lines = await _context.TransactionDocumentLines.AsNoTracking().ToListAsync(ct);
        var matchingLineIds = lines.Where(l => BookingFromLineService.MatchesRule(l, rule)).Select(l => l.Id).ToHashSet();
        if (matchingLineIds.Count == 0)
            return Ok(Array.Empty<RuleMatchingBookingDto>());

        var bookings = await _context.Bookings
            .AsNoTracking()
            .Where(b => b.SourceDocumentLineId != null && matchingLineIds.Contains(b.SourceDocumentLineId.Value))
            .ToListAsync(ct);
        var lineById = lines.ToDictionary(l => l.Id);
        var result = new List<RuleMatchingBookingDto>();
        foreach (var b in bookings)
        {
            if (!b.SourceDocumentLineId.HasValue) continue;
            var line = lineById.GetValueOrDefault(b.SourceDocumentLineId.Value);
            result.Add(new RuleMatchingBookingDto
            {
                Id = b.Id,
                Date = b.Date,
                Reference = b.Reference,
                RequiresReview = b.RequiresReview,
                ReviewedAt = b.ReviewedAt,
                ContraAccountName = line?.ContraAccountName,
                Description = line?.Description,
                Amount = line?.Amount ?? 0,
                Currency = line?.Currency ?? "EUR",
            });
        }
        return Ok(result.OrderByDescending(x => x.Date).ThenBy(x => x.Reference));
    }

    /// <summary>PUT /api/businessrules/{id} - Update a booking rule.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<object>> Update(int id, [FromBody] UpdateBusinessRuleRequest request, CancellationToken ct = default)
    {
        var rule = await _context.BusinessRules.FindAsync([id], ct);
        if (rule == null)
            return NotFound(new { error = "Rule not found" });
        if (rule.IsSystemGenerated)
            return BadRequest(new { error = "This rule was created automatically and cannot be edited." });
        if (request.Name != null)
            rule.Name = request.Name.Trim();
        if (request.Criteria != null)
            ApplyCriteriaToRule(rule, request.Criteria, request.MatchField, request.MatchOperator, request.MatchValue);
        else if (request.MatchField != null || request.MatchOperator != null || request.MatchValue != null)
        {
            if (request.MatchField != null) rule.MatchField = request.MatchField.Trim();
            if (request.MatchOperator != null) rule.MatchOperator = request.MatchOperator.Trim();
            if (request.MatchValue != null) rule.MatchValue = request.MatchValue.Trim();
            rule.CriteriaJson = null;
        }
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
        var criteria = BusinessRuleCriteria.GetCriteria(rule).Select(c => new { matchField = c.MatchField, matchOperator = c.MatchOperator, matchValue = c.MatchValue }).ToList();
        var allRules = await _context.BusinessRules.ToListAsync(ct);
        var conflictMap = BuildConflictMap(allRules);
        var conflictRuleIds = conflictMap.TryGetValue(rule.Id, out var ids) ? ids : Array.Empty<int>();
        return Ok(new { rule.Id, rule.Name, rule.MatchField, rule.MatchOperator, rule.MatchValue, criteria, conflictRuleIds, rule.LedgerAccountId, LedgerAccountName = rule.LedgerAccount?.Name, rule.SecondLedgerAccountId, SecondLedgerAccountName = rule.SecondLedgerAccount?.Name, rule.SortOrder, rule.IsActive, rule.RequiresReview, rule.IsSystemGenerated });
    }

    /// <summary>DELETE /api/businessrules/{id} - Delete a booking rule.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var rule = await _context.BusinessRules.FindAsync([id], ct);
        if (rule == null)
            return NotFound(new { error = "Rule not found" });
        if (rule.IsSystemGenerated)
            return BadRequest(new { error = "This rule was created automatically and cannot be deleted." });
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
            MatchField = "ContraAccountName",
            MatchOperator = "Contains",
            MatchValue = "",
            LedgerAccountId = request.LedgerAccountId,
            SecondLedgerAccountId = request.SecondLedgerAccountId > 0 ? request.SecondLedgerAccountId : null,
            SortOrder = request.SortOrder,
            IsActive = true,
            RequiresReview = request.RequiresReview,
        };
        ApplyCriteriaToRule(rule, request.Criteria, request.MatchField, request.MatchOperator, request.MatchValue);
        _context.BusinessRules.Add(rule);
        await _context.SaveChangesAsync(ct);
        await _context.Entry(rule).Reference(r => r.LedgerAccount).LoadAsync(ct);
        await _context.Entry(rule).Reference(r => r.SecondLedgerAccount).LoadAsync(ct);
        var criteria = BusinessRuleCriteria.GetCriteria(rule).Select(c => new { matchField = c.MatchField, matchOperator = c.MatchOperator, matchValue = c.MatchValue }).ToList();
        var allRules = await _context.BusinessRules.ToListAsync(ct);
        var conflictMap = BuildConflictMap(allRules);
        var conflictRuleIds = conflictMap.TryGetValue(rule.Id, out var ids) ? ids : Array.Empty<int>();
        return CreatedAtAction(nameof(GetAll), new { id = rule.Id, rule.Name, rule.MatchField, rule.MatchOperator, rule.MatchValue, criteria, conflictRuleIds, rule.LedgerAccountId, LedgerAccountName = rule.LedgerAccount?.Name, rule.SecondLedgerAccountId, SecondLedgerAccountName = rule.SecondLedgerAccount?.Name, rule.SortOrder, rule.IsActive, rule.RequiresReview, rule.IsSystemGenerated });
    }

    private static void ApplyCriteriaToRule(BusinessRule rule, List<CriterionRequest>? criteria, string? singleField, string? singleOperator, string? singleValue)
    {
        if (criteria != null && criteria.Count > 0)
        {
            rule.CriteriaJson = JsonSerializer.Serialize(criteria.Select(c => new { matchField = c.MatchField?.Trim() ?? "ContraAccountName", matchOperator = c.MatchOperator?.Trim() ?? "Contains", matchValue = c.MatchValue?.Trim() ?? "" }), JsonOptions);
            var first = criteria[0];
            rule.MatchField = string.IsNullOrWhiteSpace(first.MatchField) ? "ContraAccountName" : first.MatchField.Trim();
            rule.MatchOperator = string.IsNullOrWhiteSpace(first.MatchOperator) ? "Contains" : first.MatchOperator.Trim();
            rule.MatchValue = first.MatchValue?.Trim() ?? "";
        }
        else
        {
            rule.CriteriaJson = null;
            rule.MatchField = string.IsNullOrWhiteSpace(singleField) ? "ContraAccountName" : singleField.Trim();
            rule.MatchOperator = string.IsNullOrWhiteSpace(singleOperator) ? "Contains" : singleOperator.Trim();
            rule.MatchValue = singleValue?.Trim() ?? "";
        }
    }
}

public class CriterionRequest
{
    public string? MatchField { get; set; }
    public string? MatchOperator { get; set; }
    public string? MatchValue { get; set; }
}

public class CreateBusinessRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MatchField { get; set; }
    public string? MatchOperator { get; set; }
    public string? MatchValue { get; set; }
    /// <summary>When set, all criteria must match (saved as CriteriaJson). If empty, single MatchField/MatchOperator/MatchValue is used.</summary>
    public List<CriterionRequest>? Criteria { get; set; }
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
    public List<CriterionRequest>? Criteria { get; set; }
    public int? LedgerAccountId { get; set; }
    public int? SecondLedgerAccountId { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
    public bool? RequiresReview { get; set; }
}

public class RuleMatchingBookingDto
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; }
    public string Reference { get; set; } = "";
    public bool RequiresReview { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ContraAccountName { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
}
