using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Dtos;
using NimboB2B.Infrastructure.Persistence;

namespace NimboB2B.Application.Services;

/// Single source of truth for order progress. Used by the orders list, the
/// dashboard and the order-detail screen so every surface shows the same number.
///
/// Rules (mirrors the order-detail business logic):
///  - "misc" documents never count.
///  - documents belonging to a skipped stage never count.
///  - the Initial-PDI stage is measured by vehicles assigned vs order quantity,
///    not by its document slot; it is dropped entirely when skipped.
///  - no countable items at all => 100%.
public static class OrderProgressCalculator
{
    public const string PdiInitialStageId = "pdi_initial";
    public const string MiscStageId = "misc";

    public const int StepsTotal = 8;

    public sealed record Input(string OrderId, int Quantity, int AssignedVehicles,
        int InsuredVehicles = 0, int RtoVehicles = 0);

    public sealed record DocRow(string OrderId, string StageId, string Status);

    // The 8 workflow steps, in order.
    private static readonly string[] StepIds =
        { "pi", "billing", PdiInitialStageId, "invoices", "form21_22", "insurance", "rto", "pdi_final" };

    public static ProgressDto Compute(Input order, IEnumerable<DocRow> docs, ISet<string> skippedStageIds)
    {
        var total = 0;
        var uploaded = 0;
        var docList = docs as List<DocRow> ?? docs.ToList();

        foreach (var d in docList)
        {
            if (d.StageId == MiscStageId) continue;
            if (d.StageId == PdiInitialStageId) continue; // measured by vehicles below
            if (skippedStageIds.Contains(d.StageId)) continue;
            total += 1;
            if (d.Status == "uploaded") uploaded += 1;
        }

        if (!skippedStageIds.Contains(PdiInitialStageId) && order.Quantity > 0)
        {
            total += order.Quantity;
            uploaded += Math.Min(order.AssignedVehicles, order.Quantity);
        }

        // Step-based count (always out of 8). A step counts as complete when:
        //  - it is skipped, or
        //  - pdi_initial: assigned vehicles meet the order quantity, or
        //  - insurance: vehicles with an insurance document meet the quantity, or
        //  - rto: vehicles with an RTO slip meet the quantity, or
        //  - it has no document slots (e.g. insurance stage before the Excel), or
        //  - every document slot is uploaded.
        var stepsCompleted = 0;
        foreach (var stepId in StepIds)
        {
            if (skippedStageIds.Contains(stepId)) { stepsCompleted++; continue; }
            bool complete = stepId switch
            {
                PdiInitialStageId => order.Quantity <= 0 || order.AssignedVehicles >= order.Quantity,
                "insurance" => order.Quantity <= 0 || order.InsuredVehicles >= order.Quantity,
                "rto" => order.Quantity <= 0 || order.RtoVehicles >= order.Quantity,
                _ => docList.Where(d => d.StageId == stepId && d.StageId != MiscStageId)
                             .All(d => d.Status == "uploaded"),
            };
            if (complete) stepsCompleted++;
        }
        stepsCompleted = Math.Min(stepsCompleted, StepsTotal);

        var pct = total == 0 ? 100 : (int)Math.Round(100.0 * uploaded / total);
        return new ProgressDto(total, uploaded, pct, stepsCompleted, StepsTotal);
    }

    /// Computes progress for many orders in one round-trip.
    public static async Task<Dictionary<string, ProgressDto>> ComputeManyAsync(
        AppDbContext db, IReadOnlyCollection<string> orderIds, CancellationToken ct)
    {
        if (orderIds.Count == 0) return new Dictionary<string, ProgressDto>();

        var orders = await db.Orders.AsNoTracking()
            .Where(o => orderIds.Contains(o.Id))
            .Select(o => new { o.Id, o.Quantity })
            .ToListAsync(ct);

        var docs = await db.StageDocuments.AsNoTracking()
            .Where(d => orderIds.Contains(d.OrderId))
            .Select(d => new DocRow(d.OrderId, d.StageId, d.Status))
            .ToListAsync(ct);

        var skips = await db.StageSkips.AsNoTracking()
            .Where(s => orderIds.Contains(s.OrderId))
            .Select(s => new { s.OrderId, s.StageId })
            .ToListAsync(ct);

        var vehicleCounts = await db.Vehicles.AsNoTracking()
            .Where(v => v.AssignedOrderId != null && orderIds.Contains(v.AssignedOrderId!))
            .GroupBy(v => v.AssignedOrderId!)
            .Select(g => new { OrderId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // Vehicles with an insurance document (current or historical, any file).
        var insuredCounts = await db.VehicleInsurancePolicies.AsNoTracking()
            .Where(p => p.OrderId != null && orderIds.Contains(p.OrderId) && p.FileUrl != null)
            .GroupBy(p => p.OrderId!)
            .Select(g => new { OrderId = g.Key, Count = g.Select(x => x.VehicleVin).Distinct().Count() })
            .ToListAsync(ct);

        // Vehicles with an RTO slip (distinct registration numbers per order).
        var rtoCounts = await db.RtoSlips.AsNoTracking()
            .Where(r => orderIds.Contains(r.OrderId))
            .GroupBy(r => r.OrderId)
            .Select(g => new { OrderId = g.Key, Count = g.Select(x => x.RegistrationNumber).Distinct().Count() })
            .ToListAsync(ct);

        var docsByOrder = docs.GroupBy(d => d.OrderId).ToDictionary(g => g.Key, g => g.ToList());
        var skipsByOrder = skips.GroupBy(s => s.OrderId)
            .ToDictionary(g => g.Key, g => (ISet<string>)new HashSet<string>(g.Select(x => x.StageId)));
        var vehiclesByOrder = vehicleCounts.ToDictionary(x => x.OrderId, x => x.Count);
        var insuredByOrder = insuredCounts.ToDictionary(x => x.OrderId, x => x.Count);
        var rtoByOrder = rtoCounts.ToDictionary(x => x.OrderId, x => x.Count);

        var result = new Dictionary<string, ProgressDto>();
        foreach (var o in orders)
        {
            var input = new Input(o.Id, o.Quantity,
                vehiclesByOrder.TryGetValue(o.Id, out var vc) ? vc : 0,
                insuredByOrder.TryGetValue(o.Id, out var ic) ? ic : 0,
                rtoByOrder.TryGetValue(o.Id, out var rc) ? rc : 0);
            var d = docsByOrder.TryGetValue(o.Id, out var dl) ? dl : new List<DocRow>();
            var s = skipsByOrder.TryGetValue(o.Id, out var sl) ? sl : new HashSet<string>();
            result[o.Id] = Compute(input, d, s);
        }
        return result;
    }

    public static async Task<ProgressDto> ComputeAsync(AppDbContext db, string orderId, CancellationToken ct)
    {
        var map = await ComputeManyAsync(db, new[] { orderId }, ct);
        return map.TryGetValue(orderId, out var p) ? p : new ProgressDto(0, 0, 100);
    }
}
