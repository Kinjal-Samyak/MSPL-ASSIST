using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NimboB2B.Application.Dtos;
using NimboB2B.Domain.Entities;
using NimboB2B.Domain.Enums;
using NimboB2B.Infrastructure.Persistence;

namespace NimboB2B.Application.Services;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "nimbob2b";
    public string Audience { get; set; } = "nimbob2b-app";
    public string Secret { get; set; } = "change-me-please-min-32-chars-!!";
    public int ExpiryHours { get; set; } = 12;
}

public sealed class AuthService(AppDbContext db, IOptions<JwtOptions> jwt)
{
    private readonly JwtOptions _jwt = jwt.Value;

    public async Task<LoginResponse?> LoginAsync(string email, string password, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower().Trim() && u.IsActive, ct);
        if (user is null) return null;
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) return null;
        return new LoginResponse(IssueToken(user), await ToDtoAsync(user, ct));
    }

    public async Task<UserDto?> GetUserAsync(Guid id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        return user is null ? null : await ToDtoAsync(user, ct);
    }

    public async Task ChangePasswordAsync(Guid userId, string current, string next, CancellationToken ct)
    {
        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
        if (!BCrypt.Net.BCrypt.Verify(current, user.PasswordHash))
            throw new InvalidOperationException("Current password is incorrect.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(next, workFactor: 12);
        await db.SaveChangesAsync(ct);
    }

    public async Task<AppUser> CreateUserAsync(string email, string password, string? name, IEnumerable<AppRole> roles, CancellationToken ct)
    {
        email = email.ToLower().Trim();
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new InvalidOperationException("A user with this email already exists.");
        var user = new AppUser
        {
            Email = email,
            Name = name,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12),
        };
        db.Users.Add(user);
        foreach (var r in roles.Distinct())
            db.UserRoles.Add(new UserRole { UserId = user.Id, Role = r });
        await db.SaveChangesAsync(ct);
        return user;
    }

    public string IssueToken(AppUser user)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, user.Name ?? user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_jwt.ExpiryHours),
            signingCredentials: creds);
        return handler.WriteToken(token);
    }

    private async Task<UserDto> ToDtoAsync(AppUser user, CancellationToken ct)
    {
        var roles = await db.UserRoles.Where(r => r.UserId == user.Id).Select(r => r.Role.ToString()).ToListAsync(ct);
        return new UserDto(user.Id, user.Email, user.Name, roles.Select(RoleToWire).ToList());
    }

    // Frontend uses snake_case-ish role strings; map C# PascalCase enum names to those.
    public static string RoleToWire(string enumName) => enumName switch
    {
        "Admin" => "admin",
        "RajatTeam" => "rajat_team",
        "Accounts" => "accounts",
        "PdiTeam" => "pdi_team",
        "RtoAgent" => "rto_agent",
        "InsuranceAgent" => "insurance_agent",
        "ServiceTeam" => "service_team",
        _ => enumName.ToLowerInvariant(),
    };

    public static AppRole? RoleFromWire(string wire) => wire switch
    {
        "admin" => AppRole.Admin,
        "rajat_team" => AppRole.RajatTeam,
        "accounts" => AppRole.Accounts,
        "pdi_team" => AppRole.PdiTeam,
        "rto_agent" => AppRole.RtoAgent,
        "insurance_agent" => AppRole.InsuranceAgent,
        "service_team" => AppRole.ServiceTeam,
        _ => null,
    };
}
