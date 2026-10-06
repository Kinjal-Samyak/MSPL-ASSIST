using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Services;

namespace NimboB2B.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/dashboard")]
public sealed class DashboardController(StageOpsService svc) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct) => Ok(await svc.DashboardSummaryAsync(ct));
}
