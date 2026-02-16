using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetWorthNavigator.Backend.Data;
using NetWorthNavigator.Backend.Domain.Entities;

namespace NetWorthNavigator.Backend.Controllers;

[ApiController]
[Route("api/assets-liabilities/mortgages")]
public class MortgagesController : ControllerBase
{
    private readonly AppDbContext _context;

    public MortgagesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Mortgage>>> GetAll()
    {
        var mortgages = await _context.Mortgages.AsNoTracking().OrderBy(m => m.SortOrder).ThenBy(m => m.Name).ToListAsync();
        return Ok(mortgages);
    }

    [HttpPost]
    public async Task<ActionResult<Mortgage>> Create([FromBody] Mortgage item)
    {
        item.Id = 0;
        var maxOrder = await _context.Mortgages.Select(m => (int?)m.SortOrder).MaxAsync() ?? 0;
        item.SortOrder = maxOrder + 1;
        _context.Mortgages.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = item.Id }, item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Mortgage>> Update(int id, [FromBody] Mortgage item)
    {
        if (id != item.Id) return BadRequest();
        var existing = await _context.Mortgages.FindAsync(id);
        if (existing == null) return NotFound();
        existing.Name = item.Name;
        existing.StartValue = item.StartValue;
        existing.InterestStartDate = item.InterestStartDate;
        existing.TermYears = item.TermYears;
        existing.CurrentInterestRate = item.CurrentInterestRate;
        existing.FixedRatePeriodYears = item.FixedRatePeriodYears;
        existing.AmortizationType = item.AmortizationType;
        existing.IsPaidOff = item.IsPaidOff;
        existing.CurrentValue = item.CurrentValue;
        existing.Currency = item.Currency ?? "EUR";
        
        // Calculate ExtraPaidOff if CurrentValue is provided
        if (item.CurrentValue.HasValue && !item.IsPaidOff)
        {
            var startDate = item.InterestStartDate;
            // Use first working day of next month as reference date (when mortgage payment is typically made)
            var referenceDate = GetFirstWorkingDayOfNextMonth(DateTime.Now);
            var yearsElapsed = (referenceDate - startDate).TotalDays / 365.25;
            var yearsRemaining = Math.Max(0, item.TermYears - yearsElapsed);
            
            if (yearsRemaining > 0)
            {
                // Calculate normal expected remaining value based on amortization type
                decimal normalRemainingValue;
                if (item.AmortizationType == AmortizationType.Annuity)
                {
                    normalRemainingValue = CalculateAnnuityRemainingValue(
                        item.StartValue, 
                        item.CurrentInterestRate, 
                        item.TermYears, 
                        yearsElapsed);
                }
                else // Linear
                {
                    normalRemainingValue = item.StartValue * (decimal)(yearsRemaining / item.TermYears);
                }
                
                // Extra paid off = Normal remaining value - Actual remaining value (CurrentValue)
                // This represents how much more has been paid off than expected
                existing.ExtraPaidOff = Math.Max(0, normalRemainingValue - item.CurrentValue.Value);
            }
            else
            {
                existing.ExtraPaidOff = 0;
            }
        }
        else if (item.IsPaidOff)
        {
            existing.ExtraPaidOff = 0;
        }
        else if (!item.CurrentValue.HasValue)
        {
            // Reset ExtraPaidOff if CurrentValue is cleared
            existing.ExtraPaidOff = 0;
        }
        
        await _context.SaveChangesAsync();
        // Detach and reload to ensure all fields are included in response
        _context.Entry(existing).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
        var reloaded = await _context.Mortgages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        return Ok(reloaded ?? existing);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.Mortgages.FindAsync(id);
        if (existing == null) return NotFound();
        _context.Mortgages.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Gets the first working day (Monday-Friday) of the next month.</summary>
    private static DateTime GetFirstWorkingDayOfNextMonth(DateTime date)
    {
        var firstDayOfNextMonth = new DateTime(date.Year, date.Month, 1).AddMonths(1);
        // Find first working day (skip weekends)
        while (firstDayOfNextMonth.DayOfWeek == DayOfWeek.Saturday || firstDayOfNextMonth.DayOfWeek == DayOfWeek.Sunday)
        {
            firstDayOfNextMonth = firstDayOfNextMonth.AddDays(1);
        }
        return firstDayOfNextMonth;
    }

    /// <summary>Calculates remaining mortgage value for annuity amortization.</summary>
    private static decimal CalculateAnnuityRemainingValue(decimal startValue, decimal annualInterestRate, int termYears, double yearsElapsed)
    {
        if (yearsElapsed <= 0) return startValue;
        if (yearsElapsed >= termYears) return 0;

        var monthlyRate = (double)(annualInterestRate / 100m / 12m);
        var totalMonths = termYears * 12;
        var monthsElapsed = (int)(yearsElapsed * 12);
        
        if (monthlyRate == 0)
        {
            // If no interest, it's effectively linear
            return startValue * (decimal)((termYears - yearsElapsed) / termYears);
        }

        // Calculate monthly payment: P * (r * (1+r)^n) / ((1+r)^n - 1)
        var monthlyPayment = (double)startValue * (monthlyRate * Math.Pow(1 + monthlyRate, totalMonths)) / (Math.Pow(1 + monthlyRate, totalMonths) - 1);

        // Calculate remaining balance after monthsElapsed: P * (1+r)^t - Payment * (((1+r)^t - 1) / r)
        var remainingBalance = (double)startValue * Math.Pow(1 + monthlyRate, monthsElapsed) - monthlyPayment * ((Math.Pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate);
        
        return Math.Max(0, (decimal)remainingBalance);
    }
}
