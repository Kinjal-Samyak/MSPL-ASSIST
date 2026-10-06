using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Dtos;
using NimboB2B.Domain.Entities;
using NimboB2B.Infrastructure.Persistence;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Application.Services;

/// Client master records: CRUD, GST document upload, and mapping of legacy
/// (unlinked) orders onto a client for backward compatibility.
public sealed class ClientService(AppDbContext db, IFileStore files)
{
    public async Task<List<object>> ListAsync(CancellationToken ct)
    {
        var clients = await db.Clients.AsNoTracking().OrderBy(c => c.ClientName).ToListAsync(ct);
        var orderCounts = await db.Orders.AsNoTracking()
            .Where(o => o.ClientId != null)
            .GroupBy(o => o.ClientId!)
            .Select(g => new { ClientId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ClientId, x => x.Count, ct);
        return clients.Select(c => ToWire(c, orderCounts.TryGetValue(c.Id, out var n) ? n : 0)).ToList();
    }

    public async Task<object?> GetAsync(Guid id, CancellationToken ct)
    {
        var c = await db.Clients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;
        var orders = await db.Orders.AsNoTracking()
            .Where(o => o.ClientId == id)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new { o.Id, o.Quantity, o.CreatedAt })
            .ToListAsync(ct);
        return new { client = ToWire(c, orders.Count), orders };
    }

    /// Orders that exist but are not linked to any client (legacy data).
    public async Task<List<object>> ListUnmappedOrdersAsync(CancellationToken ct) =>
        (await db.Orders.AsNoTracking()
            .Where(o => o.ClientId == null)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new { id = o.Id, client_name = o.ClientName, quantity = o.Quantity, created_at = o.CreatedAt })
            .ToListAsync(ct)).Cast<object>().ToList();

    public async Task<object> CreateAsync(CreateClientRequest req, CancellationToken ct)
    {
        var name = (req.Client_Name ?? "").Trim();
        if (name.Length == 0) throw new InvalidOperationException("Client name is required.");
        var client = new Client
        {
            ClientName = name,
            ClientNumber = req.Client_Number?.Trim(),
            Email = req.Email?.Trim(),
            State = req.State?.Trim(),
            City = req.City?.Trim(),
            GstNumber = req.Gst_Number?.Trim(),
        };
        db.Clients.Add(client);
        // Every client gets a master order group; orders for this client join it.
        db.MasterOrderGroups.Add(new MasterOrderGroup
        {
            ClientId = client.Id,
            Code = await NextGroupCodeAsync(ct),
        });
        await db.SaveChangesAsync(ct);
        return ToWire(client, 0);
    }

    public async Task<object> UpdateAsync(Guid id, UpdateClientRequest req, CancellationToken ct)
    {
        var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new InvalidOperationException("Client not found.");
        c.ClientNumber = req.Client_Number?.Trim();
        c.Email = req.Email?.Trim();
        if (req.State is not null) c.State = req.State.Trim();
        if (req.City is not null) c.City = req.City.Trim();
        c.GstNumber = req.Gst_Number?.Trim();
        await db.SaveChangesAsync(ct);
        var count = await db.Orders.CountAsync(o => o.ClientId == id, ct);
        return ToWire(c, count);
    }

    public async Task<object> UploadGstAsync(Guid id, FilePayload file, string? uploadedBy, CancellationToken ct)
    {
        var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new InvalidOperationException("Client not found.");
        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("GST document must be a PDF file.");
        if (file.FileSize > 10 * 1024 * 1024)
            throw new InvalidOperationException("GST document must be 10 MB or smaller.");
        var bytes = Convert.FromBase64String(file.FileBase64);
        using var ms = new MemoryStream(bytes);
        var stored = await files.SaveAsync($"clients/{id}", file.FileName, ms, ct);
        c.GstFileName = file.FileName;
        c.GstFileSize = stored.Size;
        c.GstFilePath = stored.RelativePath;
        c.GstUploadedBy = uploadedBy;
        c.GstUploadedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    /// Links existing (legacy) orders to a client. Orders keep their own
    /// client_name; only the reference is set. Also joins them to the
    /// client's master order group.
    public async Task<object> MapOrdersAsync(Guid id, List<string> orderIds, CancellationToken ct)
    {
        var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new InvalidOperationException("Client not found.");
        var group = await db.MasterOrderGroups.FirstOrDefaultAsync(g => g.ClientId == id, ct);
        if (group is null)
        {
            group = new MasterOrderGroup { ClientId = id, Code = await NextGroupCodeAsync(ct) };
            db.MasterOrderGroups.Add(group);
        }
        var orders = await db.Orders.Where(o => orderIds.Contains(o.Id)).ToListAsync(ct);
        foreach (var o in orders)
        {
            o.ClientId = id;
            o.MasterOrderGroupId = group.Id;
        }
        await db.SaveChangesAsync(ct);
        return new { ok = true, mapped = orders.Count };
    }

    internal async Task<string> NextGroupCodeAsync(CancellationToken ct)
    {
        var count = await db.MasterOrderGroups.CountAsync(ct);
        return $"MO-{1001 + count}";
    }

    private object ToWire(Client c, int orderCount) => new
    {
        id = c.Id,
        client_name = c.ClientName,
        client_number = c.ClientNumber,
        email = c.Email,
        state = c.State,
        city = c.City,
        gst_number = c.GstNumber,
        gst_file_name = c.GstFileName,
        gst_file_size = c.GstFileSize,
        gst_file_url = FileWire.Url(files, c.GstFilePath, c.GstFileName),
        gst_file_path = FileWire.Path(files, c.GstFilePath),
        gst_uploaded_by = c.GstUploadedBy,
        gst_uploaded_at = c.GstUploadedAt,
        order_count = orderCount,
        created_at = c.CreatedAt,
        updated_at = c.UpdatedAt,
    };
}
