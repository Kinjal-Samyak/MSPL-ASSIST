using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Services;
using NimboB2B.Domain.Enums;
using NimboB2B.Infrastructure.Persistence;

namespace NimboB2B.Api.Auth;

/// Resolves the authenticated user's roles from the local user_roles table.
public sealed class CurrentUser(IHttpContextAccessor http, AppDbContext db)
{
    private List<AppRole>? _cached;

    public Guid UserId
    {
        get
        {
            var sub = http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? http.HttpContext?.User.FindFirstValue("sub");
            return Guid.TryParse(sub, out var g) ? g : Guid.Empty;
        }
    }

    public string? DisplayName =>
        http.HttpContext?.User.FindFirstValue("name")
        ?? http.HttpContext?.User.FindFirstValue(ClaimTypes.Name)
        ?? http.HttpContext?.User.FindFirstValue(ClaimTypes.Email)
        ?? http.HttpContext?.User.FindFirstValue("email");

    public string? Email =>
        http.HttpContext?.User.FindFirstValue(ClaimTypes.Email)
        ?? http.HttpContext?.User.FindFirstValue("email");

    public async Task<IReadOnlyList<AppRole>> GetRolesAsync(CancellationToken ct = default)
    {
        if (_cached is not null) return _cached;
        var uid = UserId;
        if (uid == Guid.Empty) return _cached = new();
        _cached = await db.UserRoles.AsNoTracking()
            .Where(r => r.UserId == uid)
            .Select(r => r.Role)
            .ToListAsync(ct);
        return _cached;
    }

    public async Task<List<string>> GetWireRolesAsync(CancellationToken ct = default)
    {
        var roles = await GetRolesAsync(ct);
        return roles.Select(r => AuthService.RoleToWire(r.ToString())).ToList();
    }

    public async Task<bool> HasAnyAsync(params AppRole[] roles)
    {
        var mine = await GetRolesAsync();
        return mine.Any(roles.Contains);
    }

    public async Task<bool> IsAdminOrRajatAsync() => await HasAnyAsync(AppRole.Admin, AppRole.RajatTeam);

    public async Task RequireAdminOrRajatAsync()
    {
        if (!await IsAdminOrRajatAsync())
            throw new UnauthorizedAccessException("Admin or Rajat's team required.");
    }
}
