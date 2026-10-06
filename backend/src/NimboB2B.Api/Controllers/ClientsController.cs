using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Services;

namespace NimboB2B.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/clients")]
public sealed class ClientsController(ClientService clients, CurrentUser me) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await clients.ListAsync(ct));

    [HttpGet("unmapped-orders")]
    public async Task<IActionResult> UnmappedOrders(CancellationToken ct) =>
        Ok(await clients.ListUnmappedOrdersAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var c = await clients.GetAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try { return Ok(await clients.CreateAsync(req, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateClientRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try { return Ok(await clients.UpdateAsync(id, req, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/gst")]
    public async Task<IActionResult> UploadGst(Guid id, [FromBody] FilePayload req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try { return Ok(await clients.UploadGstAsync(id, req, me.DisplayName ?? me.Email, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:guid}/map-orders")]
    public async Task<IActionResult> MapOrders(Guid id, [FromBody] MapOrdersRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        try { return Ok(await clients.MapOrdersAsync(id, req.Order_Ids, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
