using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Services;

namespace NimboB2B.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/orders")]
public sealed class OrdersController(OrderService orders, VehicleService vehicles, CurrentUser me) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await orders.ListAsync(ct));

    [HttpGet("ids")]
    public async Task<IActionResult> ListIds(CancellationToken ct) => Ok(await orders.ListIdsAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try
        {
            var id = await orders.CreateAsync(req, me.UserId, ct);
            return Ok(new CreateOrderResponse(id));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var o = await orders.GetDetailAsync(id, ct);
        return o is null ? NotFound() : Ok(o);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateOrderRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try { return Ok(await orders.UpdateAsync(id, req, me.UserId, me.DisplayName ?? me.Email, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("{id}/assignment-events")]
    public async Task<IActionResult> AssignmentEvents(string id, CancellationToken ct) =>
        Ok(await vehicles.ListOrderEventsAsync(id, ct));
}
