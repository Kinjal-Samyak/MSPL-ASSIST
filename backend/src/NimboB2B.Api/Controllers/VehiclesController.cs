using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Services;

namespace NimboB2B.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/vehicles")]
public sealed class VehiclesController(VehicleService vehicles, CurrentUser me) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await vehicles.ListAsync(ct));

    [HttpGet("{idOrVin}")]
    public async Task<IActionResult> Get(string idOrVin, CancellationToken ct)
    {
        var v = await vehicles.GetWithRelatedAsync(idOrVin, ct);
        return v is null ? NotFound() : Ok(v);
    }

    [HttpPost("{vin}/unassign")]
    public async Task<IActionResult> Unassign(string vin, [FromBody] UnassignRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try { await vehicles.UnassignAsync(vin, me.UserId, me.DisplayName, null, ct); return Ok(new { ok = true }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("{vin}/assignment-events")]
    public async Task<IActionResult> Events(string vin, CancellationToken ct) =>
        Ok(await vehicles.ListVehicleEventsAsync(vin, ct));
}
