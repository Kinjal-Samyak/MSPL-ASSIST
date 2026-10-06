using System.IO.Compression;
using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Excel;
using NimboB2B.Domain.Entities;
using NimboB2B.Infrastructure.Persistence;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Application.Services;

/// Handles every stage-ops endpoint the frontend calls: stage-document uploads,
/// billing notes, stage skips, misc docs, PDI Excel parsing (initial + final),
/// Final PDI verification, bulk PDF filename-matching for invoices / RTO slips
/// / insurance policies, and the order-level ZIP export.
public sealed class StageOpsService(AppDbContext db, IFileStore files)
{
    // ── File storage helper (base64 payload → local file store) ──────────
    public async Task<(string relative, string url, long size)> StoreBase64Async(string folder, FilePayload file, CancellationToken ct)
    {
        var bytes = Convert.FromBase64String(file.FileBase64);
        using var ms = new MemoryStream(bytes);
        var stored = await files.SaveAsync(folder, file.FileName, ms, ct);
        // Persist the storage-relative path only — the base URL is applied at read time.
        return (stored.RelativePath, stored.RelativePath, stored.Size);
    }

    // ── Stage documents ──────────────────────────────────────────────────
    public async Task<object> UploadStageDocumentAsync(Guid stageDocId, StageDocUploadRequest req, string? uploadedBy, CancellationToken ct)
    {
        var doc = await db.StageDocuments.FirstOrDefaultAsync(d => d.Id == stageDocId, ct)
                  ?? throw new InvalidOperationException("Stage document slot not found.");
        var payload = new FilePayload(req.FileName, req.FileBase64, req.FileSize);
        var (_, url, size) = await StoreBase64Async($"stage-docs/{doc.OrderId}/{doc.StageId}", payload, ct);
        doc.Status = "uploaded";
        doc.FileName = req.FileName;
        doc.FileSize = size;
        doc.FileUrl = url;
        doc.UploadedBy = uploadedBy;
        doc.UploadedAt = DateTime.UtcNow;
        doc.Notes = req.Notes;

        // PI propagation: a Proforma Invoice uploaded on one order applies to
        // every sibling order in the same master order group (PI is raised
        // once per client requirement). Sibling PI slots get the same file.
        if (doc.StageId == "pi" && doc.DocumentName == "Proforma Invoice")
        {
            var groupId = await db.Orders.Where(o => o.Id == doc.OrderId)
                .Select(o => o.MasterOrderGroupId).FirstOrDefaultAsync(ct);
            if (groupId is { } gid)
            {
                var siblingOrderIds = await db.Orders
                    .Where(o => o.MasterOrderGroupId == gid && o.Id != doc.OrderId)
                    .Select(o => o.Id).ToListAsync(ct);
                if (siblingOrderIds.Count > 0)
                {
                    var siblingDocs = await db.StageDocuments
                        .Where(d => siblingOrderIds.Contains(d.OrderId)
                                    && d.StageId == "pi"
                                    && d.DocumentName == "Proforma Invoice")
                        .ToListAsync(ct);
                    foreach (var sd in siblingDocs)
                    {
                        sd.Status = "uploaded";
                        sd.FileName = doc.FileName;
                        sd.FileSize = doc.FileSize;
                        sd.FileUrl = doc.FileUrl;
                        sd.UploadedBy = doc.UploadedBy;
                        sd.UploadedAt = doc.UploadedAt;
                    }
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return new { ok = true, url };
    }

    // ── Billing notes ────────────────────────────────────────────────────
    public async Task<object?> GetBillingNoteAsync(string orderId, CancellationToken ct) =>
        await db.BillingNotes.AsNoTracking().Where(b => b.OrderId == orderId).FirstOrDefaultAsync(ct);

    public async Task<object> SaveBillingNoteAsync(string orderId, string notes, string? updatedBy, CancellationToken ct)
    {
        var existing = await db.BillingNotes.FirstOrDefaultAsync(b => b.OrderId == orderId, ct);
        if (existing is null)
            db.BillingNotes.Add(new BillingNote { OrderId = orderId, Notes = notes, UpdatedBy = updatedBy });
        else { existing.Notes = notes; existing.UpdatedBy = updatedBy; }
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    // ── Stage skips ──────────────────────────────────────────────────────
    public Task<List<StageSkip>> ListSkipsAsync(string orderId, CancellationToken ct) =>
        db.StageSkips.AsNoTracking().Where(s => s.OrderId == orderId).ToListAsync(ct);

    public async Task<object> SkipStageAsync(string orderId, string stageId, string? reason, string? actor, CancellationToken ct)
    {
        var existing = await db.StageSkips.FirstOrDefaultAsync(s => s.OrderId == orderId && s.StageId == stageId, ct);
        if (existing is null)
            db.StageSkips.Add(new StageSkip { OrderId = orderId, StageId = stageId, Reason = reason, SkippedBy = actor, SkippedAt = DateTime.UtcNow });
        else { existing.Reason = reason; existing.SkippedBy = actor; existing.SkippedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    public async Task<object> UnskipStageAsync(string orderId, string stageId, CancellationToken ct)
    {
        var existing = await db.StageSkips.FirstOrDefaultAsync(s => s.OrderId == orderId && s.StageId == stageId, ct);
        if (existing is not null) db.StageSkips.Remove(existing);
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    // ── Misc docs ────────────────────────────────────────────────────────
    public async Task<List<object>> ListMiscAsync(string orderId, CancellationToken ct) =>
        (await db.StageDocuments.AsNoTracking()
            .Where(d => d.OrderId == orderId && d.StageId == "misc")
            .OrderByDescending(d => d.UploadedAt).ToListAsync(ct))
            .Select(d => OrderService.StageDocToWire(files, d)).ToList();

    public async Task<object> UploadMiscAsync(string orderId, MiscUploadRequest req, string? actor, CancellationToken ct)
    {
        var (_, url, size) = await StoreBase64Async($"misc/{orderId}", req.File, ct);
        db.StageDocuments.Add(new StageDocument
        {
            OrderId = orderId, StageId = "misc", DocumentName = req.DocumentName, Status = "uploaded",
            FileName = req.File.FileName, FileSize = size, FileUrl = url, UploadedBy = actor, UploadedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    // ── Simple list endpoints ────────────────────────────────────────────
    public async Task<List<object>> ListPdiAsync(string orderId, CancellationToken ct) =>
        (await db.PdiUploads.AsNoTracking().Where(p => p.OrderId == orderId).OrderByDescending(p => p.UploadedAt).ToListAsync(ct))
            .Select(p => FileWire.PdiUploadToWire(files, p)).ToList();

    public async Task<List<object>> ListBulkInvoicesAsync(string orderId, CancellationToken ct) =>
        (await db.BulkInvoices.AsNoTracking().Where(b => b.OrderId == orderId).OrderByDescending(b => b.UploadedAt).ToListAsync(ct))
            .Select(b => FileWire.BulkInvoiceToWire(files, b)).ToList();

    public async Task<List<object>> ListIndividualInvoicesAsync(string orderId, CancellationToken ct) =>
        (await db.IndividualInvoices.AsNoTracking().Where(i => i.OrderId == orderId).OrderByDescending(i => i.UploadedAt).ToListAsync(ct))
            .Select(i => FileWire.IndividualInvoiceToWire(files, i)).ToList();

    public async Task<List<object>> ListRtoSlipsAsync(string orderId, CancellationToken ct) =>
        (await db.RtoSlips.AsNoTracking().Where(r => r.OrderId == orderId).OrderByDescending(r => r.UploadedAt).ToListAsync(ct))
            .Select(r => FileWire.RtoSlipToWire(files, r)).ToList();

    public async Task<List<object>> ListRtoExcelAsync(string orderId, CancellationToken ct) =>
        (await db.RtoExcelUploads.AsNoTracking().Where(r => r.OrderId == orderId).OrderByDescending(r => r.UploadedAt).ToListAsync(ct))
            .Select(r => FileWire.RtoExcelToWire(files, r)).ToList();

    public async Task<List<object>> ListInsurancePoliciesAsync(string orderId, CancellationToken ct) =>
        (await db.InsurancePolicies.AsNoTracking().Where(p => p.OrderId == orderId).OrderByDescending(p => p.UploadedAt).ToListAsync(ct))
            .Select(p => FileWire.InsurancePolicyToWire(files, p)).ToList();

    public async Task<List<object>> ListInsuranceExcelAsync(string orderId, CancellationToken ct) =>
        (await db.InsuranceExcelUploads.AsNoTracking().Where(p => p.OrderId == orderId).OrderByDescending(p => p.UploadedAt).ToListAsync(ct))
            .Select(p => FileWire.InsuranceExcelToWire(files, p)).ToList();

    public Task<List<FinalPdiVerification>> ListFinalPdiVerificationsAsync(string orderId, CancellationToken ct) =>
        db.FinalPdiVerifications.AsNoTracking().Where(f => f.OrderId == orderId).OrderByDescending(f => f.CreatedAt).ToListAsync(ct);

    public async Task<List<object>> ListFormDocumentsAsync(string orderId, CancellationToken ct) =>
        (await db.StageDocuments.AsNoTracking()
            .Where(d => d.OrderId == orderId && d.StageId == "form21_22" && d.FormType != null)
            .OrderByDescending(d => d.UploadedAt).ToListAsync(ct))
            .Select(d => OrderService.StageDocToWire(files, d)).ToList();

    // ── Simple single-file uploads (bulk invoice, bulk zip, forms, RTO/insurance excel) ──
    public async Task<object> UploadBulkInvoiceAsync(string orderId, FilePayload file, string? actor, CancellationToken ct)
    {
        var (_, url, size) = await StoreBase64Async($"bulk-invoices/{orderId}", file, ct);
        db.BulkInvoices.Add(new BulkInvoice { OrderId = orderId, FileName = file.FileName, FileSize = size, FileUrl = url, UploadedBy = actor });
        await MarkStageDocUploadedAsync(orderId, "Bulk Invoice", file.FileName, size, url, actor, ct);
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    public async Task<object> UploadBulkInvoiceZipAsync(string orderId, FilePayload file, string? actor, CancellationToken ct)
    {
        if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Bulk Invoice Zip must be a .zip file.");
        var (_, url, size) = await StoreBase64Async($"bulk-invoice-zip/{orderId}", file, ct);
        await MarkStageDocUploadedAsync(orderId, "Bulk Invoice Zip", file.FileName, size, url, actor, ct);
        await db.SaveChangesAsync(ct);
        return new { ok = true, url };
    }

    public async Task<object> UploadFormAsync(string orderId, FormUploadRequest req, string? actor, CancellationToken ct)
    {
        if (!req.File.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Form 21 / Form 22 must be uploaded as a .zip file.");
        var (_, url, size) = await StoreBase64Async($"forms/{orderId}", req.File, ct);
        var doc = await db.StageDocuments.FirstOrDefaultAsync(
            d => d.OrderId == orderId && d.StageId == "form21_22" && d.DocumentName == req.FormType, ct);
        if (doc is null)
        {
            doc = new StageDocument { OrderId = orderId, StageId = "form21_22", DocumentName = req.FormType };
            db.StageDocuments.Add(doc);
        }
        doc.FormType = req.FormType;
        doc.Status = "uploaded";
        doc.FileName = req.File.FileName;
        doc.FileSize = size;
        doc.FileUrl = url;
        doc.UploadedBy = actor;
        doc.UploadedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    public async Task<object> UploadRtoExcelAsync(string orderId, FilePayload file, string? actor, CancellationToken ct)
    {
        var (_, url, size) = await StoreBase64Async($"rto-excel/{orderId}", file, ct);
        var upload = new RtoExcelUpload { OrderId = orderId, FileName = file.FileName, FileSize = size, FileUrl = url, UploadedBy = actor };
        db.RtoExcelUploads.Add(upload);
        await MarkStageDocUploadedAsync(orderId, "Excel from RTO", file.FileName, size, url, actor, ct);

        var bytes = Convert.FromBase64String(file.FileBase64);
        using var ms = new MemoryStream(bytes);
        var rows = PdiParser.ParseRto(ms);
        int updated = 0;
        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        var byVin = vehicles.ToDictionary(v => v.Vin, StringComparer.OrdinalIgnoreCase);
        foreach (var (vin, reg) in rows)
        {
            if (!byVin.TryGetValue(vin, out var vh)) continue;
            vh.RegistrationNumber = reg;
            updated++;
        }
        upload.RowCount = rows.Count;
        await db.SaveChangesAsync(ct);
        return new { parsed = rows.Count, updated, unmatched = rows.Count - updated };
    }

    public async Task<object> UploadInsuranceExcelAsync(string orderId, FilePayload file, string? actor, CancellationToken ct)
    {
        var (_, url, size) = await StoreBase64Async($"insurance-excel/{orderId}", file, ct);
        var upload = new InsuranceExcelUpload { OrderId = orderId, FileName = file.FileName, FileSize = size, FileUrl = url, UploadedBy = actor };
        db.InsuranceExcelUploads.Add(upload);
        await MarkStageDocUploadedAsync(orderId, "Excel from Insurance", file.FileName, size, url, actor, ct);

        var bytes = Convert.FromBase64String(file.FileBase64);
        using var ms = new MemoryStream(bytes);
        var rows = PdiParser.ParseInsurance(ms);
        int updated = 0;
        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        var byVin = vehicles.ToDictionary(v => v.Vin, StringComparer.OrdinalIgnoreCase);
        foreach (var (vin, pol) in rows)
        {
            if (!byVin.TryGetValue(vin, out var vh)) continue;
            vh.PolicyNumber = pol;
            updated++;
        }
        upload.VehiclesUpdated = updated;
        await db.SaveChangesAsync(ct);
        return new { parsed = rows.Count, updated, unmatched = rows.Count - updated };
    }

    public async Task<bool> HasAnyRegistrationAsync(string orderId, CancellationToken ct) =>
        await db.Vehicles.AnyAsync(v => v.AssignedOrderId == orderId && v.RegistrationNumber != null, ct);

    public async Task<bool> HasAnyPolicyNumberAsync(string orderId, CancellationToken ct) =>
        await db.Vehicles.AnyAsync(v => v.AssignedOrderId == orderId && v.PolicyNumber != null, ct);

    // ── Helper: keep the stage-document slot in sync with a repeated upload ──
    private async Task MarkStageDocUploadedAsync(string orderId, string documentName, string fileName, long size, string url, string? actor, CancellationToken ct)
    {
        var doc = await db.StageDocuments.FirstOrDefaultAsync(d => d.OrderId == orderId && d.DocumentName == documentName, ct);
        if (doc is null) return;
        doc.Status = "uploaded";
        doc.FileName = fileName;
        doc.FileSize = size;
        doc.FileUrl = url;
        doc.UploadedBy = actor;
        doc.UploadedAt = DateTime.UtcNow;
    }

    // ── Dashboard summary ────────────────────────────────────────────────
    public async Task<object> DashboardSummaryAsync(CancellationToken ct)
    {
        var orders = await db.Orders.AsNoTracking().OrderByDescending(o => o.CreatedAt).ToListAsync(ct);
        var totalVehicles = await db.Vehicles.AsNoTracking().CountAsync(ct);
        var vendorFlagged = await db.Vehicles.AsNoTracking().CountAsync(v => v.VendorFlagged, ct);
        var pending = await db.StageDocuments.AsNoTracking().CountAsync(d => d.Status != "uploaded", ct);
        // Same calculator the orders list and order-detail screen use.
        var progress = await OrderProgressCalculator.ComputeManyAsync(db, orders.Select(o => o.Id).ToList(), ct);

        return new
        {
            stats = new
            {
                totalOrders = orders.Count,
                totalVehicles,
                pendingDocuments = pending,
                vendorFlagged,
            },
            recentOrders = orders.Take(8).Select(o => new
            {
                id = o.Id,
                client_name = o.ClientName,
                quantity = o.Quantity,
                created_at = o.CreatedAt,
                pi_type = o.PiType == NimboB2B.Domain.Enums.PiType.Sale ? "purchase" : "lease",
                progressPct = progress.TryGetValue(o.Id, out var p) ? p.Pct : 100,
            }).ToList(),
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Initial PDI upload — parse xlsx, insert vehicles, flag vendor mismatch.
    // ═══════════════════════════════════════════════════════════════════════
    public async Task<object> UploadInitialPdiAsync(string orderId, PdiUploadRequest req, string? actor, CancellationToken ct)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new InvalidOperationException("Order not found.");
        var file = new FilePayload(req.FileName, req.FileBase64, req.FileSize);
        var (_, url, size) = await StoreBase64Async($"pdi/initial/{orderId}", file, ct);

        var bytes = Convert.FromBase64String(req.FileBase64);
        using var ms = new MemoryStream(bytes);
        var rows = PdiParser.ParsePdi(ms);
        if (rows.Count == 0) throw new InvalidOperationException("PDI sheet has no data rows.");

        var existingVins = new HashSet<string>(
            await db.Vehicles.Where(v => rows.Select(r => r.Vin).Contains(v.Vin)).Select(v => v.Vin).ToListAsync(ct),
            StringComparer.OrdinalIgnoreCase);

        var distinctVendors = rows.Select(r => r.CustomerVendor?.Trim() ?? "")
            .Where(v => v.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).Count();
        var vendorFlag = distinctVendors > 1;

        int inserted = 0, skipped = 0;
        var now = DateTime.UtcNow;
        foreach (var r in rows)
        {
            if (existingVins.Contains(r.Vin)) { skipped++; continue; }
            db.Vehicles.Add(new Vehicle
            {
                Vin = r.Vin,
                VehicleId = r.VehicleId,
                MotorId = r.MotorId,
                ControllerId = r.ControllerId,
                VcuId = r.VcuId,
                McuId = r.McuId,
                DiuNumber = r.DiuNumber,
                IotImei = r.IotImei,
                IotSim = r.IotSim,
                ItemCode = r.ItemCode,
                ItemName = r.ItemName,
                ProductionDate = r.ProductionDate,
                CustomerVendor = r.CustomerVendor,
                IsLowSpeed = req.IsLowSpeed,
                RegistrationNumber = r.RegistrationNumber,
                RegistrationDate = r.RegistrationDate,
                PolicyNumber = r.PolicyNumber,
                InsuranceInvoiceNumber = r.InsuranceInvoiceNumber,
                AssignedOrderId = orderId,
                AssignedClient = order.ClientName,
                AssignedAt = now,
                AssignedBy = actor,
                VendorFlagged = vendorFlag,
            });
            inserted++;
        }

        db.PdiUploads.Add(new PdiUpload
        {
            OrderId = orderId, PdiType = "initial", FileName = req.FileName, FileSize = size,
            FileUrl = url, VehicleCount = inserted, UploadedBy = actor, UploadedAt = now,
        });
        await MarkStageDocUploadedAsync(orderId, "Initial PDI Sheet", req.FileName, size, url, actor, ct);
        await db.SaveChangesAsync(ct);
        return new { inserted, skipped, vendorFlagged = vendorFlag, parsed = rows.Count };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Final PDI upload — update existing vehicles by VIN; never insert.
    // ═══════════════════════════════════════════════════════════════════════
    public async Task<object> UploadFinalPdiAsync(string orderId, FilePayload file, string? actor, CancellationToken ct)
    {
        var (_, url, size) = await StoreBase64Async($"pdi/final/{orderId}", file, ct);
        var bytes = Convert.FromBase64String(file.FileBase64);
        using var ms = new MemoryStream(bytes);
        var rows = PdiParser.ParsePdi(ms);

        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        var byVin = vehicles.ToDictionary(v => v.Vin, StringComparer.OrdinalIgnoreCase);

        int updated = 0;
        var unmatched = new List<string>();
        foreach (var r in rows)
        {
            if (!byVin.TryGetValue(r.Vin, out var vh)) { unmatched.Add(r.Vin); continue; }
            if (r.RegistrationNumber is not null) vh.RegistrationNumber = r.RegistrationNumber;
            if (r.RegistrationDate is not null) vh.RegistrationDate = r.RegistrationDate;
            if (r.PolicyNumber is not null) vh.PolicyNumber = r.PolicyNumber;
            if (r.InsuranceInvoiceNumber is not null) vh.InsuranceInvoiceNumber = r.InsuranceInvoiceNumber;
            if (!string.IsNullOrWhiteSpace(r.CustomerVendor) &&
                !string.IsNullOrWhiteSpace(vh.CustomerVendor) &&
                !string.Equals(vh.CustomerVendor.Trim(), r.CustomerVendor.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                vh.VendorFlagged = true;
            }
            updated++;
        }

        db.PdiUploads.Add(new PdiUpload
        {
            OrderId = orderId, PdiType = "final", FileName = file.FileName, FileSize = size,
            FileUrl = url, VehicleCount = updated, UploadedBy = actor, UploadedAt = DateTime.UtcNow,
        });
        await MarkStageDocUploadedAsync(orderId, "Final PDI Sheet", file.FileName, size, url, actor, ct);
        await db.SaveChangesAsync(ct);
        return new { updated, unmatched, parsed = rows.Count };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Final PDI verification — writes a fresh set of pass/fail check rows.
    // ═══════════════════════════════════════════════════════════════════════
    public async Task<object> RunFinalPdiVerificationAsync(string orderId, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        var existing = await db.FinalPdiVerifications.Where(v => v.OrderId == orderId).ToListAsync(ct);
        db.FinalPdiVerifications.RemoveRange(existing);

        int okCount = 0;
        foreach (var v in vehicles)
        {
            var checks = new List<(string Type, bool Ok, string? Expected, string? Actual)>();
            var regRequired = !v.IsLowSpeed;
            checks.Add(("registration_number",
                !regRequired || !string.IsNullOrWhiteSpace(v.RegistrationNumber),
                regRequired ? "non-empty" : "optional (low-speed)",
                v.RegistrationNumber));
            checks.Add(("policy_number", !string.IsNullOrWhiteSpace(v.PolicyNumber), "non-empty", v.PolicyNumber));
            checks.Add(("vendor_flag", !v.VendorFlagged, "not flagged", v.VendorFlagged ? "flagged" : "clean"));

            var allOk = checks.All(c => c.Ok);
            if (allOk) okCount++;
            foreach (var c in checks)
            {
                if (c.Ok) continue;
                db.FinalPdiVerifications.Add(new FinalPdiVerification
                {
                    OrderId = orderId, VehicleVin = v.Vin, VehicleId = v.VehicleId,
                    CheckType = c.Type, Status = "fail", Expected = c.Expected, Actual = c.Actual,
                });
            }
        }
        await db.SaveChangesAsync(ct);
        return new { ok = okCount, total = vehicles.Count };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Bulk PDF filename-match — preview & confirm for invoices/RTO/insurance.
    // ═══════════════════════════════════════════════════════════════════════
    private enum MatchDomain { IndividualInvoice, RtoSlip, InsurancePolicy }

    private static bool FileNameContains(string fileName, string? key) =>
        !string.IsNullOrWhiteSpace(key) && fileName.Contains(key!, StringComparison.OrdinalIgnoreCase);

    private async Task<(List<object> Matched, List<string> Unmatched)> PreviewInternalAsync(
        string orderId, List<string> fileNames, MatchDomain domain, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.AsNoTracking()
            .Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        var matched = new List<object>();
        var unmatched = new List<string>();
        foreach (var fn in fileNames)
        {
            Vehicle? hit = domain switch
            {
                MatchDomain.IndividualInvoice => vehicles.FirstOrDefault(v => FileNameContains(fn, v.Vin)),
                MatchDomain.RtoSlip           => vehicles.FirstOrDefault(v => FileNameContains(fn, v.RegistrationNumber)),
                MatchDomain.InsurancePolicy   => vehicles.FirstOrDefault(v => FileNameContains(fn, v.PolicyNumber)),
                _ => null,
            };
            if (hit is null) { unmatched.Add(fn); continue; }
            matched.Add(domain switch
            {
                MatchDomain.IndividualInvoice => new { fileName = fn, vin = hit.Vin },
                MatchDomain.RtoSlip           => new { fileName = fn, registrationNumber = hit.RegistrationNumber },
                MatchDomain.InsurancePolicy   => new { fileName = fn, policyNumber = hit.PolicyNumber },
                _ => new { fileName = fn },
            });
        }
        return (matched, unmatched);
    }

    public async Task<object> PreviewIndividualInvoiceMatchAsync(string orderId, List<string> fileNames, CancellationToken ct)
    {
        var (matched, unmatched) = await PreviewInternalAsync(orderId, fileNames, MatchDomain.IndividualInvoice, ct);
        return new { matched, unmatched };
    }
    public async Task<object> PreviewRtoSlipMatchAsync(string orderId, List<string> fileNames, CancellationToken ct)
    {
        var (matched, unmatched) = await PreviewInternalAsync(orderId, fileNames, MatchDomain.RtoSlip, ct);
        return new { matched, unmatched };
    }
    public async Task<object> PreviewInsurancePolicyMatchAsync(string orderId, List<string> fileNames, CancellationToken ct)
    {
        var (matched, unmatched) = await PreviewInternalAsync(orderId, fileNames, MatchDomain.InsurancePolicy, ct);
        return new { matched, unmatched };
    }

    public async Task<object> ConfirmIndividualInvoiceUploadAsync(string orderId, List<FilePayload> files, string? actor, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        int inserted = 0;
        foreach (var f in files)
        {
            var hit = vehicles.FirstOrDefault(v => FileNameContains(f.FileName, v.Vin));
            if (hit is null) continue;
            var (_, url, size) = await StoreBase64Async($"individual-invoices/{orderId}", f, ct);
            db.IndividualInvoices.Add(new IndividualInvoice
            {
                OrderId = orderId, VehicleVin = hit.Vin, FileName = f.FileName,
                FileSize = size, FileUrl = url, UploadedBy = actor,
            });
            inserted++;
        }
        await MarkStageDocUploadedAsync(orderId, "Individual Invoices", $"{inserted} file(s)", 0, "", actor, ct);
        await db.SaveChangesAsync(ct);
        return new { inserted };
    }

    public async Task<object> ConfirmRtoSlipUploadAsync(string orderId, List<FilePayload> files, string? actor, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        int inserted = 0;
        foreach (var f in files)
        {
            var hit = vehicles.FirstOrDefault(v => FileNameContains(f.FileName, v.RegistrationNumber));
            if (hit?.RegistrationNumber is null) continue;
            var (_, url, size) = await StoreBase64Async($"rto-slips/{orderId}", f, ct);
            db.RtoSlips.Add(new RtoSlip
            {
                OrderId = orderId, RegistrationNumber = hit.RegistrationNumber, FileName = f.FileName,
                FileSize = size, FileUrl = url, UploadedBy = actor,
            });
            inserted++;
        }
        await MarkStageDocUploadedAsync(orderId, "RTO Slips", $"{inserted} file(s)", 0, "", actor, ct);
        await db.SaveChangesAsync(ct);
        return new { inserted };
    }

    public async Task<object> ConfirmInsurancePolicyUploadAsync(string orderId, List<FilePayload> payloads, string? actor, CancellationToken ct)
    {
        var vehicles = await db.Vehicles.Where(v => v.AssignedOrderId == orderId).ToListAsync(ct);
        int inserted = 0;
        foreach (var f in payloads)
        {
            var hit = vehicles.FirstOrDefault(v => FileNameContains(f.FileName, v.PolicyNumber));
            if (hit?.PolicyNumber is null) continue;
            var (_, url, size) = await StoreBase64Async($"insurance-policies/{orderId}", f, ct);
            db.InsurancePolicies.Add(new InsurancePolicy
            {
                OrderId = orderId, PolicyNumber = hit.PolicyNumber, FileName = f.FileName,
                FileSize = size, FileUrl = url, UploadedBy = actor,
            });
            // Also attach the document to the vehicle's own insurance record so
            // it shows up on the vehicle detail page and in Insurance History.
            await InsuranceService.AttachPolicyFileAsync(
                db, hit, orderId, hit.PolicyNumber, f.FileName, size, url, actor, ct);
            inserted++;
        }
        await MarkStageDocUploadedAsync(orderId, "Insurance Policies", $"{inserted} file(s)", 0, "", actor, ct);
        await db.SaveChangesAsync(ct);
        return new { inserted };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Order-level ZIP export.
    // ═══════════════════════════════════════════════════════════════════════
    public async Task<object> DownloadOrderZipAsync(string orderId, CancellationToken ct)
    {
        var stageDocs = await db.StageDocuments.AsNoTracking().Where(d => d.OrderId == orderId && d.FileUrl != null).ToListAsync(ct);
        var invoices = await db.IndividualInvoices.AsNoTracking().Where(i => i.OrderId == orderId).ToListAsync(ct);
        var bulks = await db.BulkInvoices.AsNoTracking().Where(b => b.OrderId == orderId).ToListAsync(ct);
        var rtoSlips = await db.RtoSlips.AsNoTracking().Where(r => r.OrderId == orderId).ToListAsync(ct);
        var insPols = await db.InsurancePolicies.AsNoTracking().Where(p => p.OrderId == orderId).ToListAsync(ct);
        var pdi = await db.PdiUploads.AsNoTracking().Where(p => p.OrderId == orderId).ToListAsync(ct);

        var entries = new List<(string PathInZip, string RelativePath, string FileName)>();
        void AddIf(string? url, string? name, string subfolder)
        {
            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(name)) return;
            var rel = files.NormalizePath(url);
            if (string.IsNullOrEmpty(rel)) return;
            entries.Add(($"{orderId}/{subfolder}/{name}", rel, name));
        }

        foreach (var d in stageDocs) AddIf(d.FileUrl, d.FileName, $"stage-docs/{d.StageId}");
        foreach (var p in pdi) AddIf(p.FileUrl, p.FileName, $"02-PDI/{p.PdiType}");
        foreach (var b in bulks) AddIf(b.FileUrl, b.FileName, "03-Invoicing/bulk");
        foreach (var i in invoices) AddIf(i.FileUrl, i.FileName, "03-Invoicing/individual");
        foreach (var r in rtoSlips) AddIf(r.FileUrl, r.FileName, "04-RTO");
        foreach (var p in insPols) AddIf(p.FileUrl, p.FileName, "05-Insurance");

        if (entries.Count == 0) return new { empty = true };

        using var out_ = new MemoryStream();
        using (var zip = new ZipArchive(out_, ZipArchiveMode.Create, leaveOpen: true))
        {
            var seen = new HashSet<string>();
            foreach (var (path, rel, _) in entries)
            {
                var safePath = path;
                int n = 1;
                while (!seen.Add(safePath))
                {
                    var ext = Path.GetExtension(path);
                    var stem = path[..^ext.Length];
                    safePath = $"{stem} ({n++}){ext}";
                }
                try
                {
                    await using var src = await files.OpenReadAsync(rel, ct);
                    var entry = zip.CreateEntry(safePath, CompressionLevel.Fastest);
                    await using var es = entry.Open();
                    await src.CopyToAsync(es, ct);
                }
                catch { /* Missing file — skip so one bad file doesn't kill the export. */ }
            }
        }
        var b64 = Convert.ToBase64String(out_.ToArray());
        return new { empty = false, fileCount = entries.Count, fileName = $"{orderId}.zip", base64 = b64 };
    }

}
