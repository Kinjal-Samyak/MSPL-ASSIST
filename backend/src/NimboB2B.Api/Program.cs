using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Services;
using NimboB2B.Infrastructure.Interceptors;
using NimboB2B.Infrastructure.Persistence;
using NimboB2B.Infrastructure.Storage;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration));

// --- Persistence ---
builder.Services.AddDbContext<AppDbContext>((sp, opt) =>
{
    opt.UseNpgsql(
            builder.Configuration.GetConnectionString("Default"),
            npg => npg.MigrationsAssembly("NimboB2B.Migrations"))
       .UseSnakeCaseNamingConvention()
       .AddInterceptors(new TimestampsInterceptor());
});

// --- Storage ---
builder.Services.Configure<LocalFileStoreOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.AddSingleton<IFileStore, LocalFileStore>();

// --- Auth (self-issued JWT) ---
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwtCfg = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwtCfg.Secret) || jwtCfg.Secret.Length < 32)
    throw new InvalidOperationException("Jwt:Secret must be at least 32 characters.");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtCfg.Secret));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.RequireHttpsMetadata = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtCfg.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtCfg.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            NameClaimType = "sub",
        };
    });
builder.Services.AddAuthorization();

// --- Services ---
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<ClientService>();
builder.Services.AddScoped<VehicleService>();
builder.Services.AddScoped<InsuranceService>();
builder.Services.AddScoped<StageOpsService>();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddHttpContextAccessor();

// --- CORS for the frontend ---
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate on startup for convenience (single-instance deploys only).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try { db.Database.Migrate(); }
    catch (Exception ex) { Log.Warning(ex, "Database migration skipped/failed on startup."); }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

app.Run();
