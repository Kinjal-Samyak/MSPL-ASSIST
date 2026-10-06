using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Dtos;
using NimboB2B.Domain.Entities;
using NimboB2B.Domain.Enums;
using NimboB2B.Infrastructure.Persistence;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Application.Services;

public sealed class OrderService(AppDbContext db, IFileStore files)
{
    private static readonly Dictionary<string, string> StateCodes = new()
    {
        ["Andhra Pradesh"] = "AP", ["Assam"] = "AS", ["Bihar"] = "BR", ["Chhattisgarh"] = "CG",
        ["Delhi"] = "DL", ["Goa"] = "GA", ["Gujarat"] = "GJ", ["Haryana"] = "HR",
        ["Himachal Pradesh"] = "HP", ["Jharkhand"] = "JH", ["Karnataka"] = "KA", ["Kerala"] = "KL",
        ["Madhya Pradesh"] = "MP", ["Maharashtra"] = "MH", ["Odisha"] = "OD", ["Punjab"] = "PB",
        ["Rajasthan"] = "RJ", ["Tamil Nadu"] = "TN", ["Telangana"] = "TS", ["Uttar Pradesh"] = "UP",
        ["Uttarakhand"] = "UK", ["West Bengal"] = "WB",
    };

    public async Task<List<OrderSummaryDto>> ListAsync(CancellationToken ct)
    {
        var orders = await db.Orders.AsNoTracking().OrderByDescending(o => o.CreatedAt).ToListAsync(ct);
        var ids = orders.Select(o => o.Id).ToList();
        // Shared calculator — keeps this list, the dashboard and the order-detail
        // screen on identical business rules.
        var progress = await OrderProgressCalculator.ComputeManyAsync(db, ids, ct);
        var groupCodes = await db.MasterOrderGroups.AsNoTracking()
            .ToDictionaryAsync(g => g.Id, g => g.Code, ct);

        return orders.Select(o =>
        {
            var p = progress.TryGetValue(o.Id, out var v) ? v : new ProgressDto(0, 0, 100, 8, 8);
            var groupCode = o.MasterOrderGroupId is { } gid && groupCodes.TryGetValue(gid, out var c) ? c : null;
            return new OrderSummaryDto(o.Id, o.ClientName, o.PiType == PiType.Sale ? "purchase" : "lease",
                o.Quantity, o.State, o.StateCode, o.City,
                o.Etd?.ToString("yyyy-MM-dd"), o.HypothecationName,
                o.ClientId, o.MasterOrderGroupId, groupCode, o.CreatedAt, p);
        }).ToList();
    }

    public async Task<List<object>> ListIdsAsync(CancellationToken ct) =>
        (await db.Orders.AsNoTracking().OrderByDescending(o => o.CreatedAt)
            .Select(o => new { id = o.Id, client_name = o.ClientName, pi_type = o.PiType == PiType.Sale ? "purchase" : "lease", quantity = o.Quantity })
            .ToListAsync(ct)).Cast<object>().ToList();

    public async Task<object?> GetDetailAsync(string id, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return null;
        var stageDocs = await db.StageDocuments.AsNoTracking().Where(d => d.OrderId == id).ToListAsync(ct);
        var vehicles = await db.Vehicles.AsNoTracking().Where(v => v.AssignedOrderId == id).ToListAsync(ct);
        var invoices = await db.IndividualInvoices.AsNoTracking().Where(i => i.OrderId == id).ToListAsync(ct);
        var rto = await db.RtoSlips.AsNoTracking().Where(r => r.OrderId == id).ToListAsync(ct);
        var ins = await db.InsurancePolicies.AsNoTracking().Where(p => p.OrderId == id).ToListAsync(ct);
        var pdi = await db.PdiUploads.AsNoTracking().Where(p => p.OrderId == id).OrderByDescending(p => p.UploadedAt).ToListAsync(ct);
        var skips = await db.StageSkips.AsNoTracking().Where(s => s.OrderId == id).ToListAsync(ct);
        var progress = await OrderProgressCalculator.ComputeAsync(db, id, ct);
        var etdHistory = await db.OrderEtdHistories.AsNoTracking()
            .Where(h => h.OrderId == id).OrderByDescending(h => h.ChangedAt).ToListAsync(ct);
        var changeLog = await db.OrderChangeLogs.AsNoTracking()
            .Where(h => h.OrderId == id).OrderByDescending(h => h.ChangedAt).ToListAsync(ct);

        object? group = null;
        List<object> siblings = new();
        if (order.MasterOrderGroupId is { } gid)
        {
            var g = await db.MasterOrderGroups.AsNoTracking().FirstOrDefaultAsync(x => x.Id == gid, ct);
            var sibs = await db.Orders.AsNoTracking().Where(o => o.MasterOrderGroupId == gid)
                .OrderBy(o => o.CreatedAt).ToListAsync(ct);
            var sibProgress = await OrderProgressCalculator.ComputeManyAsync(db, sibs.Select(s => s.Id).ToList(), ct);
            group = g is null ? null : new
            {
                id = g.Id,
                code = g.Code,
                pi_reference = g.PiReference,
                total_quantity = sibs.Sum(s => s.Quantity),
            };
            siblings = sibs.Select(s => (object)new
            {
                id = s.Id,
                quantity = s.Quantity,
                etd = s.Etd?.ToString("yyyy-MM-dd"),
                created_at = s.CreatedAt,
                progress = sibProgress.TryGetValue(s.Id, out var sp) ? sp : new ProgressDto(0, 0, 100, 8, 8),
            }).ToList();
        }

        return new
        {
            order = ToWire(order),
            masterOrderGroup = group,
            siblingOrders = siblings,
            etdHistory = etdHistory.Select(EtdHistoryToWire).ToList(),
            changeLog = changeLog.Select(ChangeLogToWire).ToList(),
            stageDocs = stageDocs.Select(d => StageDocToWire(files, d)).ToList(),
            vehicles = vehicles.Select(VehicleToWire).ToList(),
            individualInvoices = invoices.Select(i => FileWire.IndividualInvoiceToWire(files, i)).ToList(),
            rtoSlips = rto.Select(r => FileWire.RtoSlipToWire(files, r)).ToList(),
            insurancePolicies = ins.Select(p => FileWire.InsurancePolicyToWire(files, p)).ToList(),
            pdiUploads = pdi.Select(p => FileWire.PdiUploadToWire(files, p)).ToList(),
            stageSkips = skips.Select(SkipToWire).ToList(),
            progress,
        };
    }

    public async Task<string> CreateAsync(CreateOrderRequest req, Guid userId, CancellationToken ct)
    {
        if (!StateCodes.TryGetValue(req.State, out var stateCode))
            throw new InvalidOperationException($"Unsupported state: {req.State}");
        var piType = req.Pi_Type == "lease" ? PiType.Lease : PiType.Sale;

        Client? client = null;
        if (!string.IsNullOrWhiteSpace(req.Client_Id) && Guid.TryParse(req.Client_Id, out var cid))
            client = await db.Clients.FirstOrDefaultAsync(c => c.Id == cid, ct)
                     ?? throw new InvalidOperationException("Selected client was not found.");
        var clientName = client?.ClientName ?? req.Client_Name?.Trim() ?? "";
        if (clientName.Length == 0) throw new InvalidOperationException("Client is required.");

        // Auto-group: every order joins its client's single master order group.
        MasterOrderGroup? group = null;
        if (client is not null)
        {
            group = await db.MasterOrderGroups.FirstOrDefaultAsync(g => g.ClientId == client.Id, ct);
            if (group is null)
            {
                group = new MasterOrderGroup { ClientId = client.Id, Code = await NextGroupCodeAsync(ct) };
                db.MasterOrderGroups.Add(group);
            }
        }

        var initials = ClientInitials(clientName);
        var suffix = piType == PiType.Sale ? "P" : "L";
        var existingCount = await db.Orders.CountAsync(o => o.ClientName == clientName, ct);
        var seq = (existingCount + 1).ToString("D3");
        var orderId = $"{initials}-{seq}-{stateCode}{suffix}";

        var order = new Order
        {
            Id = orderId,
            ClientName = clientName,
            ClientId = client?.Id,
            MasterOrderGroupId = group?.Id,
            PiType = piType,
            FundedBy = piType == PiType.Lease ? req.Funded_By : null,
            FinancePartner = req.Finance_Partner,
            Quantity = req.Quantity,
            State = req.State,
            StateCode = stateCode,
            City = req.City?.Trim(),
            GstNumber = req.Gst_Number,
            ContactPerson = req.Contact_Person,
            Notes = req.Notes,
            HypothecationName = req.Hypothecation_Name?.Trim(),
            Etd = ParseDate(req.Etd),
            CreatedBy = userId,
        };
        db.Orders.Add(order);
        AddStageDocuments(order);

        // PI propagation: if a sibling order in this group already has an
        // uploaded Proforma Invoice, copy it onto the new order's PI slot so the
        // same PI is available on every order under the group.
        if (group is not null)
        {
            var piSource = await db.StageDocuments.AsNoTracking()
                .Where(d => d.StageId == "pi" && d.DocumentName == "Proforma Invoice" && d.Status == "uploaded")
                .Join(db.Orders.AsNoTracking().Where(o => o.MasterOrderGroupId == group.Id),
                      d => d.OrderId, o => o.Id, (d, o) => d)
                .OrderByDescending(d => d.UploadedAt)
                .FirstOrDefaultAsync(ct);
            if (piSource is not null)
            {
                var target = db.StageDocuments.Local.FirstOrDefault(d =>
                    d.OrderId == order.Id && d.StageId == "pi" && d.DocumentName == "Proforma Invoice");
                if (target is not null)
                {
                    target.Status = "uploaded";
                    target.FileName = piSource.FileName;
                    target.FileSize = piSource.FileSize;
                    target.FileUrl = piSource.FileUrl;
                    target.UploadedBy = piSource.UploadedBy;
                    target.UploadedAt = piSource.UploadedAt;
                }
            }
        }

        await db.SaveChangesAsync(ct);
        return orderId;
    }

    public async Task<object> UpdateAsync(string id, UpdateOrderRequest req, Guid userId, string? userName, CancellationToken ct)
    {
        var order = await db.Orders.FirstAsync(o => o.Id == id, ct);
        var assigned = await db.Vehicles.CountAsync(v => v.AssignedOrderId == id, ct);
        if (req.Quantity < assigned)
            throw new InvalidOperationException($"Cannot reduce quantity below assigned vehicle count ({assigned}).");

        var logs = new List<OrderChangeLog>();
        void Track(string field, string? oldV, string? newV)
        {
            if ((oldV ?? "") == (newV ?? "")) return;
            logs.Add(new OrderChangeLog
            {
                OrderId = id, Field = field, OldValue = oldV, NewValue = newV,
                ChangedBy = userId, ChangedByName = userName, ChangedAt = DateTime.UtcNow,
            });
        }

        // Client switch re-links the order to the new client's master group.
        if (!string.IsNullOrWhiteSpace(req.Client_Id) && Guid.TryParse(req.Client_Id, out var cid)
            && order.ClientId != cid)
        {
            var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == cid, ct)
                         ?? throw new InvalidOperationException("Selected client was not found.");
            var group = await db.MasterOrderGroups.FirstOrDefaultAsync(g => g.ClientId == cid, ct);
            if (group is null)
            {
                group = new MasterOrderGroup { ClientId = cid, Code = await NextGroupCodeAsync(ct) };
                db.MasterOrderGroups.Add(group);
            }
            Track("Client", order.ClientName, client.ClientName);
            order.ClientId = cid;
            order.ClientName = client.ClientName;
            order.MasterOrderGroupId = group.Id;
        }

        var newEtd = ParseDate(req.Etd);
        if (order.Etd != newEtd)
        {
            db.OrderEtdHistories.Add(new OrderEtdHistory
            {
                OrderId = id, PreviousEtd = order.Etd, NewEtd = newEtd,
                ChangedBy = userId, ChangedByName = userName, ChangedAt = DateTime.UtcNow,
            });
            Track("ETD", order.Etd?.ToString("yyyy-MM-dd"), newEtd?.ToString("yyyy-MM-dd"));
            order.Etd = newEtd;
        }

        if (!string.IsNullOrWhiteSpace(req.State) && StateCodes.TryGetValue(req.State, out var newCode))
        {
            Track("State", order.State, req.State);
            order.State = req.State;
            order.StateCode = newCode;
        }
        Track("City", order.City, req.City?.Trim());
        order.City = req.City?.Trim() ?? order.City;
        Track("Quantity", order.Quantity.ToString(), req.Quantity.ToString());
        order.Quantity = req.Quantity;
        Track("GST Number", order.GstNumber, req.Gst_Number);
        order.GstNumber = req.Gst_Number;
        Track("Contact Person", order.ContactPerson, req.Contact_Person);
        order.ContactPerson = req.Contact_Person;
        Track("Finance Partner", order.FinancePartner, req.Finance_Partner);
        order.FinancePartner = req.Finance_Partner;
        Track("Funded By", order.FundedBy, req.Funded_By);
        if (order.PiType == PiType.Lease) order.FundedBy = req.Funded_By;
        Track("Hypothecation Name", order.HypothecationName, req.Hypothecation_Name?.Trim());
        order.HypothecationName = req.Hypothecation_Name?.Trim();
        Track("Notes", order.Notes, req.Notes);
        order.Notes = req.Notes;

        if (logs.Count > 0) db.OrderChangeLogs.AddRange(logs);
        await db.SaveChangesAsync(ct);
        return new { ok = true };
    }

    private async Task<string> NextGroupCodeAsync(CancellationToken ct) =>
        $"MO-{1001 + await db.MasterOrderGroups.CountAsync(ct)}";

    private static DateOnly? ParseDate(string? s) =>
        DateOnly.TryParse(s, out var d) ? d : null;

    private static object EtdHistoryToWire(OrderEtdHistory h) => new
    {
        id = h.Id,
        order_id = h.OrderId,
        previous_etd = h.PreviousEtd?.ToString("yyyy-MM-dd"),
        new_etd = h.NewEtd?.ToString("yyyy-MM-dd"),
        changed_by = h.ChangedBy,
        changed_by_name = h.ChangedByName,
        changed_at = h.ChangedAt,
    };

    private static object ChangeLogToWire(OrderChangeLog h) => new
    {
        id = h.Id,
        order_id = h.OrderId,
        field = h.Field,
        old_value = h.OldValue,
        new_value = h.NewValue,
        changed_by = h.ChangedBy,
        changed_by_name = h.ChangedByName,
        changed_at = h.ChangedAt,
    };

    private void AddStageDocuments(Order order)
    {
        var stateCode = order.StateCode;
        var docs = new List<(string stage, string name)>
        {
            ("pi", "Proforma Invoice"),
            ("pi", order.PiType == PiType.Sale ? "Sales Invoice" : "Agreement"),
            ("billing", "Billing Details & Invoice"),
            ("pdi_initial", "Initial PDI Sheet"),
            ("invoices", "Bulk Invoice"),
            ("invoices", "Individual Invoices"),
            ("invoices", "Bulk Invoice Zip"),
            ("form21_22", "Form 22"),
            ("insurance", "Excel from Insurance"),
            ("insurance", "Insurance Policies"),
            ("rto", "RTO Slips"),
            ("rto", "Excel from RTO"),
            ("pdi_final", "Final PDI Sheet"),
        };
        if (stateCode == "MH") docs.Add(("form21_22", "Form 21"));

        foreach (var (stage, name) in docs)
        {
            if (order.PiType == PiType.Lease && name == "Sales Invoice") continue;
            if (order.PiType == PiType.Sale && name == "Agreement") continue;
            db.StageDocuments.Add(new StageDocument
            {
                OrderId = order.Id,
                StageId = stage,
                DocumentName = name,
                Status = "required",
            });
        }
    }

    public static string ClientInitials(string clientName)
    {
        var cleaned = Regex.Replace(clientName ?? "", "[^A-Za-z ]", "").Trim();
        var words = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        string initials;
        if (words.Length >= 3) initials = string.Concat(words.Take(3).Select(w => w[0]));
        else if (words.Length == 2) initials = $"{words[0][0]}{words[1][..Math.Min(2, words[1].Length)]}";
        else initials = (words.Length > 0 ? words[0] : "ORD")[..Math.Min(3, words.Length > 0 ? words[0].Length : 3)];
        return initials.ToUpperInvariant().PadRight(3, 'X')[..3];
    }

    public static object ToWire(Order o) => new
    {
        id = o.Id,
        client_name = o.ClientName,
        client_id = o.ClientId,
        master_order_group_id = o.MasterOrderGroupId,
        pi_type = o.PiType == PiType.Sale ? "purchase" : "lease",
        funded_by = o.FundedBy,
        finance_partner = o.FinancePartner,
        quantity = o.Quantity,
        state = o.State,
        state_code = o.StateCode,
        city = o.City,
        gst_number = o.GstNumber,
        contact_person = o.ContactPerson,
        hypothecation_name = o.HypothecationName,
        etd = o.Etd?.ToString("yyyy-MM-dd"),
        notes = o.Notes,
        created_at = o.CreatedAt,
        updated_at = o.UpdatedAt,
    };

    public static object VehicleToWire(Vehicle v) => new
    {
        id = v.Id,
        vin = v.Vin,
        vehicle_id = v.VehicleId,
        motor_id = v.MotorId,
        controller_id = v.ControllerId,
        vcu_id = v.VcuId,
        mcu_id = v.McuId,
        diu_number = v.DiuNumber,
        iot_imei = v.IotImei,
        iot_sim = v.IotSim,
        item_code = v.ItemCode,
        item_name = v.ItemName,
        production_date = v.ProductionDate,
        customer_vendor = v.CustomerVendor,
        is_low_speed = v.IsLowSpeed,
        registration_number = v.RegistrationNumber,
        registration_date = v.RegistrationDate,
        policy_number = v.PolicyNumber,
        insurance_invoice_number = v.InsuranceInvoiceNumber,
        insurance_start_date = v.InsuranceStartDate,
        insurance_end_date = v.InsuranceEndDate,
        assigned_order_id = v.AssignedOrderId,
        assigned_client = v.AssignedClient,
        assigned_at = v.AssignedAt,
        assigned_by = v.AssignedBy,
        vendor_flagged = v.VendorFlagged,
        created_at = v.CreatedAt,
        updated_at = v.UpdatedAt,
    };

    public static object StageDocToWire(IFileStore files, StageDocument d) => new
    {
        id = d.Id,
        order_id = d.OrderId,
        stage_id = d.StageId,
        document_name = d.DocumentName,
        status = d.Status,
        form_type = d.FormType,
        file_name = d.FileName,
        file_size = d.FileSize?.ToString(),
        file_url = FileWire.Url(files, d.FileUrl, d.FileName),
        file_path = FileWire.Path(files, d.FileUrl),
        uploaded_by = d.UploadedBy,
        uploaded_at = d.UploadedAt,
        notes = d.Notes,
    };

    public static object SkipToWire(StageSkip s) => new
    {
        id = s.Id,
        order_id = s.OrderId,
        stage_id = s.StageId,
        reason = s.Reason,
        skipped_by = s.SkippedBy,
        skipped_at = s.SkippedAt,
    };
}
