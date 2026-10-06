using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Dtos;
using NimboB2B.Domain.Entities;
using NimboB2B.Domain.Enums;
using NimboB2B.Infrastructure.Persistence;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Application.Services;

public sealed class VehicleService(AppDbContext db, IFileStore files)
{
    public async Task<List<object>> ListAsync(CancellationToken ct) =>
        (await db.Vehicles.AsNoTracking().OrderByDescending(v => v.CreatedAt).ToListAsync(ct))
            .Select(OrderService.VehicleToWire).ToList();

    public async Task<object?> GetWithRelatedAsync(string idOrVin, CancellationToken ct)
    {
        // Accept either GUID id or VIN.
        Vehicle? v;
        if (Guid.TryParse(idOrVin, out var g))
            v = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == g, ct);
        else
            v = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x => x.Vin == idOrVin, ct);
        if (v is null) return null;

        object? individualInvoice = null; object? rtoSlip = null; object? insurancePolicy = null;
        object? order = null;
        List<object> orderDocs = new(); List<object> pdiUploads = new(); List<object> bulkInvoices = new();

        if (v.AssignedOrderId is not null)
        {
            if (!string.IsNullOrEmpty(v.Vin))
            {
                var inv = await db.IndividualInvoices.AsNoTracking()
                    .Where(i => i.OrderId == v.AssignedOrderId && i.VehicleVin == v.Vin)
                    .OrderByDescending(i => i.UploadedAt).FirstOrDefaultAsync(ct);
                individualInvoice = inv is null ? null : FileWire.IndividualInvoiceToWire(files, inv);
            }
            order = await db.Orders.AsNoTracking().Where(o => o.Id == v.AssignedOrderId).FirstOrDefaultAsync(ct) is { } o
                ? OrderService.ToWire(o) : null;
            orderDocs = (await db.StageDocuments.AsNoTracking().Where(d => d.OrderId == v.AssignedOrderId).ToListAsync(ct))
                .Select(d => OrderService.StageDocToWire(files, d)).ToList();
            pdiUploads = (await db.PdiUploads.AsNoTracking().Where(p => p.OrderId == v.AssignedOrderId).OrderBy(p => p.UploadedAt).ToListAsync(ct)).Select(p => FileWire.PdiUploadToWire(files, p)).ToList();
            bulkInvoices = (await db.BulkInvoices.AsNoTracking().Where(b => b.OrderId == v.AssignedOrderId).OrderByDescending(b => b.UploadedAt).ToListAsync(ct)).Select(b => FileWire.BulkInvoiceToWire(files, b)).ToList();
        }
        if (!string.IsNullOrEmpty(v.RegistrationNumber))
        {
            var slip = await db.RtoSlips.AsNoTracking().Where(r => r.RegistrationNumber == v.RegistrationNumber)
                .OrderByDescending(r => r.UploadedAt).FirstOrDefaultAsync(ct);
            rtoSlip = slip is null ? null : FileWire.RtoSlipToWire(files, slip);
        }
        if (!string.IsNullOrEmpty(v.PolicyNumber))
        {
            var pol = await db.InsurancePolicies.AsNoTracking().Where(p => p.PolicyNumber == v.PolicyNumber)
                .OrderByDescending(p => p.UploadedAt).FirstOrDefaultAsync(ct);
            insurancePolicy = pol is null ? null : FileWire.InsurancePolicyToWire(files, pol);
        }

        return new
        {
            vehicle = OrderService.VehicleToWire(v),
            individualInvoice,
            rtoSlip,
            insurancePolicy,
            orderDocs,
            pdiUploads,
            bulkInvoices,
            order,
        };
    }

    public async Task UnassignAsync(string vin, Guid actorUserId, string? actorName, string? notes, CancellationToken ct)
    {
        var v = await db.Vehicles.FirstAsync(x => x.Vin == vin, ct);
        var previous = v.AssignedOrderId;
        if (previous is null) return;

        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == previous, ct);
        if (order is not null && order.PiType != PiType.Lease)
            throw new InvalidOperationException("Only LEASE orders allow unassigning vehicles.");

        db.VehicleAssignmentEvents.Add(new VehicleAssignmentEvent
        {
            VehicleVin = vin,
            OrderId = null,
            EventType = AssignmentEventType.Unassigned,
            PreviousOrderId = previous,
            ActorUserId = actorUserId,
            ActorName = actorName,
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
        });

        v.AssignedOrderId = null;
        v.AssignedClient = null;
        v.AssignedAt = null;
        v.AssignedBy = null;
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<object>> ListVehicleEventsAsync(string vin, CancellationToken ct) =>
        (await db.VehicleAssignmentEvents.AsNoTracking()
            .Where(e => e.VehicleVin == vin)
            .OrderByDescending(e => e.CreatedAt).ToListAsync(ct))
            .Select(EventToWire).ToList();

    public async Task<List<object>> ListOrderEventsAsync(string orderId, CancellationToken ct) =>
        (await db.VehicleAssignmentEvents.AsNoTracking()
            .Where(e => e.OrderId == orderId || e.PreviousOrderId == orderId)
            .OrderByDescending(e => e.CreatedAt).ToListAsync(ct))
            .Select(EventToWire).ToList();

    public static object EventToWire(VehicleAssignmentEvent e) => new
    {
        id = e.Id,
        vehicle_vin = e.VehicleVin,
        order_id = e.OrderId,
        event_type = e.EventType.ToString().ToLowerInvariant(),
        previous_order_id = e.PreviousOrderId,
        actor_user_id = e.ActorUserId,
        actor_name = e.ActorName,
        notes = e.Notes,
        created_at = e.CreatedAt,
    };
}
