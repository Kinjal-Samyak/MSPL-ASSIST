using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Dtos;
using NimboB2B.Domain.Entities;
using NimboB2B.Infrastructure.Persistence;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Application.Services;

public sealed class InsuranceService(AppDbContext db, IFileStore files)
{
    public async Task<List<object>> ListForVehicleAsync(string vin, CancellationToken ct) =>
        (await db.VehicleInsurancePolicies.AsNoTracking()
            .Where(p => p.VehicleVin == vin)
            .OrderByDescending(p => p.IsCurrent).ThenByDescending(p => p.EndDate)
            .ToListAsync(ct))
            .Select(p => FileWire.VehicleInsurancePolicyToWire(files, p)).ToList();

    public async Task<object> ListForOrderAsync(string orderId, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.AsNoTracking()
            .Where(v => v.AssignedOrderId == orderId)
            .Select(v => new { vin = v.Vin, vehicle_id = v.VehicleId, assigned_order_id = v.AssignedOrderId })
            .ToListAsync(ct);
        var vins = vehicles.Select(v => v.vin).ToList();
        if (vins.Count == 0) return new { vehicles = Array.Empty<object>(), policies = Array.Empty<object>() };
        var policies = await db.VehicleInsurancePolicies.AsNoTracking()
            .Where(p => vins.Contains(p.VehicleVin))
            .OrderByDescending(p => p.IsCurrent).ThenByDescending(p => p.EndDate)
            .ToListAsync(ct);
        return new { vehicles, policies = policies.Select(p => FileWire.VehicleInsurancePolicyToWire(files, p)).ToList() };
    }

    public async Task<object> AddAsync(string vin, AddInsuranceRequest req, Guid actorUserId, string? actorName, CancellationToken ct)
    {
        if (!DateOnly.TryParse(req.StartDate, out var start) || !DateOnly.TryParse(req.EndDate, out var end))
            throw new InvalidOperationException("Invalid start/end date.");
        if (end <= start) throw new InvalidOperationException("End date must be after start date.");

        // Store file (base64 -> local store)
        var bytes = Convert.FromBase64String(req.File.FileBase64);
        using var ms = new MemoryStream(bytes);
        var stored = await files.SaveAsync($"insurance/{vin}", req.File.FileName, ms, ct);

        // Flip prior current rows and refresh vehicle cache.
        var existing = await db.VehicleInsurancePolicies.Where(p => p.VehicleVin == vin && p.IsCurrent).ToListAsync(ct);
        foreach (var e in existing) e.IsCurrent = false;
        var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Vin == vin, ct);
        if (v is not null)
        {
            v.InsuranceStartDate = start;
            v.InsuranceEndDate = end;
            v.PolicyNumber = req.PolicyNumber;
        }

        var policy = new VehicleInsurancePolicy
        {
            VehicleVin = vin,
            OrderId = req.OrderId,
            PolicyNumber = req.PolicyNumber,
            StartDate = start,
            EndDate = end,
            IsCurrent = true,
            FileName = req.File.FileName,
            FileSize = req.File.FileSize,
            FileUrl = stored.RelativePath, // relative path only; base URL applied at read time
            Notes = req.Notes,
            UploadedBy = actorUserId,
            UploadedByName = actorName,
        };
        db.VehicleInsurancePolicies.Add(policy);
        await db.SaveChangesAsync(ct);
        return FileWire.VehicleInsurancePolicyToWire(files, policy);
    }

    public async Task<object> UpdateDatesAsync(Guid id, string startStr, string endStr, CancellationToken ct)
    {
        if (!DateOnly.TryParse(startStr, out var start) || !DateOnly.TryParse(endStr, out var end))
            throw new InvalidOperationException("Invalid start/end date.");
        if (end <= start) throw new InvalidOperationException("End date must be after start date.");
        var p = await db.VehicleInsurancePolicies.FirstAsync(x => x.Id == id, ct);
        p.StartDate = start;
        p.EndDate = end;
        if (p.IsCurrent)
        {
            var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Vin == p.VehicleVin, ct);
            if (v is not null) { v.InsuranceStartDate = start; v.InsuranceEndDate = end; }
        }
        await db.SaveChangesAsync(ct);
        return FileWire.VehicleInsurancePolicyToWire(files, p);
    }

    public async Task<List<object>> ExpiringWithinAsync(int days, CancellationToken ct)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(days));
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return (await db.VehicleInsurancePolicies.AsNoTracking()
            .Where(p => p.IsCurrent && p.EndDate >= today && p.EndDate <= cutoff)
            .OrderBy(p => p.EndDate)
            .ToListAsync(ct))
            .Select(p => FileWire.VehicleInsurancePolicyToWire(files, p)).ToList();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Vehicle-level policy linking.
    //
    // Uploading an insurance PDF in the order's Insurance stage used to write
    // only the order-level `insurance_policies` row, so the file never showed
    // up on the vehicle. This attaches the same file to the vehicle's CURRENT
    // policy record (creating one when none exists), which is what the vehicle
    // detail page and the Insurance Renewals panel read.
    // ═══════════════════════════════════════════════════════════════════════

    /// Attaches a policy document to a vehicle's current insurance record.
    /// Does not call SaveChanges — the caller owns the transaction.
    public static async Task AttachPolicyFileAsync(
        AppDbContext db,
        Vehicle vehicle,
        string? orderId,
        string policyNumber,
        string fileName,
        long fileSize,
        string relativePath,
        string? actorName,
        CancellationToken ct)
    {
        var current = await db.VehicleInsurancePolicies
            .Where(p => p.VehicleVin == vehicle.Vin && p.IsCurrent)
            .OrderByDescending(p => p.EndDate)
            .FirstOrDefaultAsync(ct);

        // Dates come from the insurance Excel (cached on the vehicle row).
        // Fall back to a one-year term starting today when they're not set yet.
        var start = vehicle.InsuranceStartDate ?? current?.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var end = vehicle.InsuranceEndDate ?? current?.EndDate ?? start.AddYears(1);

        if (current is not null && string.Equals(current.PolicyNumber, policyNumber, StringComparison.OrdinalIgnoreCase))
        {
            // Same policy — just attach/replace the document.
            current.FileName = fileName;
            current.FileSize = fileSize;
            current.FileUrl = relativePath;
            current.OrderId ??= orderId;
            current.StartDate = start;
            current.EndDate = end;
            if (actorName is not null) current.UploadedByName = actorName;
            return;
        }

        // Different (or first) policy number — supersede any prior current row.
        if (current is not null) current.IsCurrent = false;

        db.VehicleInsurancePolicies.Add(new VehicleInsurancePolicy
        {
            VehicleVin = vehicle.Vin,
            OrderId = orderId,
            PolicyNumber = policyNumber,
            StartDate = start,
            EndDate = end,
            IsCurrent = true,
            FileName = fileName,
            FileSize = fileSize,
            FileUrl = relativePath,
            UploadedByName = actorName,
        });

        vehicle.PolicyNumber = policyNumber;
        vehicle.InsuranceStartDate = start;
        vehicle.InsuranceEndDate = end;
    }

    /// One-off, idempotent backfill: links already-uploaded order-level
    /// insurance policy files to their vehicles by policy number.
    public async Task<object> BackfillVehiclePoliciesAsync(CancellationToken ct)
    {
        var orderPolicies = await db.InsurancePolicies.AsNoTracking()
            .OrderBy(p => p.UploadedAt)
            .ToListAsync(ct);

        var linked = 0;
        var skipped = 0;

        foreach (var op in orderPolicies)
        {
            if (string.IsNullOrWhiteSpace(op.PolicyNumber)) { skipped++; continue; }

            var vehicles = await db.Vehicles
                .Where(v => v.PolicyNumber != null && v.PolicyNumber.ToLower() == op.PolicyNumber.ToLower())
                .ToListAsync(ct);

            if (vehicles.Count == 0) { skipped++; continue; }

            foreach (var v in vehicles)
            {
                var already = await db.VehicleInsurancePolicies.AnyAsync(
                    p => p.VehicleVin == v.Vin && p.FileUrl == op.FileUrl, ct);
                if (already) continue;

                await AttachPolicyFileAsync(
                    db, v, op.OrderId, op.PolicyNumber, op.FileName, op.FileSize,
                    files.NormalizePath(op.FileUrl), op.UploadedBy, ct);
                linked++;
            }
        }

        await db.SaveChangesAsync(ct);
        return new { linked, skipped };
    }
}
