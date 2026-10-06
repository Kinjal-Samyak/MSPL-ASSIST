using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Services;
using NimboB2B.Domain.Enums;

namespace NimboB2B.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1")]
public sealed class InsuranceController(InsuranceService svc, CurrentUser me) : ControllerBase
{
    [HttpGet("vehicles/{vin}/insurance")]
    public async Task<IActionResult> ListForVehicle(string vin, CancellationToken ct) =>
        Ok(await svc.ListForVehicleAsync(vin, ct));

    [HttpPost("vehicles/{vin}/insurance")]
    public async Task<IActionResult> Add(string vin, [FromBody] AddInsuranceRequest req, CancellationToken ct)
    {
        if (!await me.HasAnyAsync(AppRole.Admin, AppRole.RajatTeam, AppRole.InsuranceAgent))
            return Forbid();
        try { return Ok(await svc.AddAsync(vin, req, me.UserId, me.DisplayName, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPatch("insurance/{id:guid}/dates")]
    public async Task<IActionResult> UpdateDates(Guid id, [FromBody] UpdateInsuranceDatesRequest req, CancellationToken ct)
    {
        if (!await me.HasAnyAsync(AppRole.Admin, AppRole.RajatTeam, AppRole.InsuranceAgent))
            return Forbid();
        try { return Ok(await svc.UpdateDatesAsync(id, req.StartDate, req.EndDate, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("insurance/expiring")]
    public async Task<IActionResult> Expiring([FromQuery] int withinDays, CancellationToken ct) =>
        Ok(await svc.ExpiringWithinAsync(Math.Clamp(withinDays, 1, 365), ct));

    [HttpGet("orders/{orderId}/insurance-history")]
    public async Task<IActionResult> HistoryForOrder(string orderId, CancellationToken ct) =>
        Ok(await svc.ListForOrderAsync(orderId, ct));

    /// Admin-only, idempotent: links insurance policy files that were uploaded
    /// through the order stage to the matching vehicles' policy records.
    [HttpPost("insurance/backfill-vehicle-policies")]
    public async Task<IActionResult> Backfill(CancellationToken ct)
    {
        if (!await me.HasAnyAsync(AppRole.Admin, AppRole.RajatTeam)) return Forbid();
        return Ok(await svc.BackfillVehiclePoliciesAsync(ct));
    }
}
