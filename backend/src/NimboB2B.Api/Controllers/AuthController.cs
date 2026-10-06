using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Services;

namespace NimboB2B.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(AuthService svc, CurrentUser me) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var res = await svc.LoginAsync(req.Email, req.Password, ct);
        if (res is null) return Unauthorized(new { error = "Invalid email or password." });
        return Ok(res);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => NoContent();

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var user = await svc.GetUserAsync(me.UserId, ct);
        if (user is null) return NotFound();
        return Ok(new
        {
            userId = user.Id,
            email = user.Email,
            name = user.Name,
            roles = user.Roles,
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 8)
            return BadRequest(new { error = "New password must be at least 8 characters." });
        try
        {
            await svc.ChangePasswordAsync(me.UserId, req.CurrentPassword, req.NewPassword, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
