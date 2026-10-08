using System.Net.Mime;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Api.Controllers;

/// Streams stored files, gated by an HMAC signature so the browser can download
/// without a bearer token. The signed link also carries the ORIGINAL file name
/// (the disk name is guid-prefixed), which is echoed back in Content-Disposition.
[ApiController]
[Route("api/v1/files")]
public sealed class FilesController(IFileStore store, IOptions<LocalFileStoreOptions> opt) : ControllerBase
{
    /// Mints a fresh signed link for an already-known stored path. The UI calls
    /// this at click time so a link embedded in stale cached data is never reused.
    [HttpGet("~/api/v1/files-sign")]
    [Authorize]
    public IActionResult Sign([FromQuery] string path, [FromQuery] string? name)
    {
        if (string.IsNullOrWhiteSpace(path)) return BadRequest(new { error = "path is required." });
        var relative = store.NormalizePath(path);
        if (string.IsNullOrWhiteSpace(relative)) return BadRequest(new { error = "Invalid path." });
        return Ok(new { url = store.CreateDownloadUrl(relative, TimeSpan.FromMinutes(15), name) });
    }

    [HttpGet("{*relativePath}")]
    [AllowAnonymous]
    public async Task<IActionResult> Download(
        string relativePath,
        [FromQuery] long exp,
        [FromQuery] string sig,
        [FromQuery] string? name,
        CancellationToken ct)
    {
        // Never let a browser or proxy cache a download response — a cached 401
        // from an expired link would otherwise break every later click.
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        Response.Headers.Pragma = "no-cache";

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp) return Unauthorized("Link expired.");

        var relative = store.NormalizePath(relativePath);
        var display = string.IsNullOrWhiteSpace(name) ? null : Path.GetFileName(name.Trim());
        var expected = ComputeSignature(LocalFileStore.SignPayload(relative, exp, display), opt.Value.DownloadSigningKey);
        if (!FixedTimeEquals(sig, expected)) return Unauthorized("Invalid signature.");

        var stream = await store.OpenReadAsync(relative, ct);

        // "Nimbo-" prefix + the original file name, never the guid-prefixed disk name.
        var raw = display ?? StripStoragePrefix(Path.GetFileName(relative));
        var downloadName = $"Nimbo-{raw}";

        var cd = new ContentDisposition { FileName = downloadName, Inline = false };
        Response.Headers.ContentDisposition = cd.ToString();

        // FileStreamResult sets Content-Length from the seekable stream and disposes it.
        return new FileStreamResult(stream, GuessContentType(raw)) { EnableRangeProcessing = true };
    }

    /// Disk names are "<32-char guid>-<original>"; recover the original tail.
    private static string StripStoragePrefix(string fileName)
    {
        var dash = fileName.IndexOf('-');
        if (dash == 32 && fileName.Length > 33) return fileName[(dash + 1)..];
        return fileName;
    }

    private static string GuessContentType(string fileName) => Path.GetExtension(fileName).ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".csv" => "text/csv",
        ".zip" => "application/zip",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls" => "application/vnd.ms-excel",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream",
    };

    private static bool FixedTimeEquals(string? a, string b)
    {
        if (string.IsNullOrEmpty(a) || a.Length != b.Length) return false;
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
    }

    private static string ComputeSignature(string payload, string key)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }
}
