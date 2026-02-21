using System.Text.Json;

namespace NetWorthNavigator.Backend.Domain;

public class RuleLineItem
{
    public int LedgerAccountId { get; set; }
    public string AmountType { get; set; } = "OppositeOfLine1"; // "OppositeOfLine1" | "Zero"
}

public static class BusinessRuleLineItems
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static IReadOnlyList<RuleLineItem> GetLineItems(Entities.BusinessRule rule)
    {
        if (!string.IsNullOrWhiteSpace(rule.LineItemsJson))
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<RuleLineItem>>(rule.LineItemsJson, JsonOptions);
                if (list != null && list.Count > 0)
                    return list;
            }
            catch { /* fallback */ }
        }
        var fallback = new List<RuleLineItem> { new() { LedgerAccountId = rule.LedgerAccountId, AmountType = "OppositeOfLine1" } };
        if (rule.SecondLedgerAccountId.HasValue && rule.SecondLedgerAccountId.Value > 0)
            fallback.Add(new() { LedgerAccountId = rule.SecondLedgerAccountId.Value, AmountType = "Zero" });
        return fallback;
    }
}
