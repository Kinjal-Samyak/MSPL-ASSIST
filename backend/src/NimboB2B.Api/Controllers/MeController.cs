using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;

namespace NimboB2B.Api.Controllers;

/// Minimal /me endpoint kept for the legacy path — auth.functions.ts calls
/// /api/v1/auth/me directly, but leaving this in place for compatibility.
[ApiController]
[Authorize]
[Route("api/v1/me")]
public sealed class MeController(CurrentUser me) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var roles = await me.GetWireRolesAsync(ct);
        return Ok(new { userId = me.UserId, name = me.DisplayName, email = me.Email, roles });
    }
}
