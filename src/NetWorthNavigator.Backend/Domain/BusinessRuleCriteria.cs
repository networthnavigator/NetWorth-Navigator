using System.Text.Json;

namespace NetWorthNavigator.Backend.Domain;

/// <summary>One criterion (field, operator, value) for a business rule. Used when rule has multiple criteria.</summary>
public class BusinessRuleCriterion
{
    public string MatchField { get; set; } = "ContraAccountName";
    public string MatchOperator { get; set; } = "Contains";
    public string MatchValue { get; set; } = string.Empty;
}

/// <summary>Returns the list of criteria for a rule. From CriteriaJson if set, otherwise single criterion from MatchField/MatchOperator/MatchValue.</summary>
public static class BusinessRuleCriteria
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static IReadOnlyList<BusinessRuleCriterion> GetCriteria(Entities.BusinessRule rule)
    {
        if (!string.IsNullOrWhiteSpace(rule.CriteriaJson))
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<BusinessRuleCriterion>>(rule.CriteriaJson, JsonOptions);
                if (list != null && list.Count > 0)
                    return list;
            }
            catch
            {
                // Fall through to single criterion
            }
        }
        return new List<BusinessRuleCriterion>
        {
            new()
            {
                MatchField = rule.MatchField ?? "ContraAccountName",
                MatchOperator = rule.MatchOperator ?? "Contains",
                MatchValue = rule.MatchValue ?? "",
            },
        };
    }

    /// <summary>Normalized key for conflict detection: same key = same criterion.</summary>
    public static string CriterionKey(string matchField, string matchOperator, string matchValue)
    {
        return $"{((matchField ?? "").Trim().ToLowerInvariant())}|{((matchOperator ?? "").Trim().ToLowerInvariant())}|{((matchValue ?? "").Trim().ToLowerInvariant())}";
    }
}
