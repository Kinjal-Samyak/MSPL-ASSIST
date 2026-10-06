// ClosedXML-based PDI/RTO/Insurance Excel parsers. Header-name driven so
// column order in source files can vary. Mirrors src/lib/pdi-parser.server.ts.
using ClosedXML.Excel;

namespace NimboB2B.Application.Excel;

public sealed record ParsedVehicleRow(
    string Vin,
    string? VehicleId,
    string? MotorId,
    string? ControllerId,
    string? VcuId,
    string? McuId,
    string? DiuNumber,
    string? IotImei,
    string? IotSim,
    string? ItemCode,
    string? ItemName,
    DateOnly? ProductionDate,
    string? CustomerVendor,
    string? RegistrationNumber,
    DateOnly? RegistrationDate,
    string? PolicyNumber,
    string? InsuranceInvoiceNumber);

public static class PdiParser
{
    private static string Normalize(string s) => (s ?? "").Trim().ToLowerInvariant();

    /// Case-insensitive substring header matcher.
    private static int? FindCol(Dictionary<int, string> headers, params string[] needles)
    {
        foreach (var (col, h) in headers)
        {
            foreach (var needle in needles)
                if (h.Contains(needle, StringComparison.OrdinalIgnoreCase)) return col;
        }
        return null;
    }

    private static Dictionary<int, string> ReadHeaders(IXLWorksheet ws)
    {
        var map = new Dictionary<int, string>();
        var firstRow = ws.FirstRowUsed();
        if (firstRow is null) return map;
        foreach (var c in firstRow.CellsUsed())
            map[c.Address.ColumnNumber] = c.GetString().Trim();
        return map;
    }

    private static string? CellString(IXLRow row, int? col)
    {
        if (col is null) return null;
        var v = row.Cell(col.Value).GetString().Trim();
        return string.IsNullOrEmpty(v) ? null : v;
    }

    private static DateOnly? CellDate(IXLRow row, int? col)
    {
        if (col is null) return null;
        var cell = row.Cell(col.Value);
        try
        {
            if (cell.DataType == XLDataType.DateTime) return DateOnly.FromDateTime(cell.GetDateTime());
        }
        catch { }
        var s = cell.GetString().Trim();
        if (string.IsNullOrEmpty(s)) return null;
        if (DateTime.TryParse(s, out var dt)) return DateOnly.FromDateTime(dt);
        return null;
    }

    /// Parses an Initial or Final PDI workbook. Skips header/label/total rows automatically.
    public static IReadOnlyList<ParsedVehicleRow> ParsePdi(Stream xlsxStream)
    {
        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheets.FirstOrDefault();
        if (ws is null) return Array.Empty<ParsedVehicleRow>();
        var headers = ReadHeaders(ws);
        if (headers.Count == 0) return Array.Empty<ParsedVehicleRow>();

        var vinCol = FindCol(headers, "vin");
        var vehicleIdCol = FindCol(headers, "vehicle id", "vehicleid");
        var itemCodeCol = FindCol(headers, "item code");
        var itemNameCol = FindCol(headers, "item name");
        var vcuCol = FindCol(headers, "vcu");
        var mcuCol = FindCol(headers, "mcu");
        var motorCol = FindCol(headers, "motor");
        var diuCol = FindCol(headers, "diu");
        var ctrlCol = FindCol(headers, "controller", "controler");
        var prodCol = FindCol(headers, "production");
        var custCol = FindCol(headers, "customer", "vendor");
        var regNoCol = FindCol(headers, "registration number", "regn no", "reg no");
        var regDtCol = FindCol(headers, "registration date");
        var polCol = FindCol(headers, "policy");
        var insInvCol = FindCol(headers, "insurance invoice");
        var sixSenseCol = FindCol(headers, "six sense", "iot");
        if (vinCol is null) return Array.Empty<ParsedVehicleRow>();

        var result = new List<ParsedVehicleRow>();
        var firstDataRow = ws.FirstRowUsed()!.RowNumber() + 1;
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;

        for (int rn = firstDataRow; rn <= lastRow; rn++)
        {
            var row = ws.Row(rn);
            var vin = CellString(row, vinCol);
            if (vin is null) continue;
            if (string.Equals(vin, "VIN ID", StringComparison.OrdinalIgnoreCase)) continue;
            if (vin.StartsWith("Total", StringComparison.OrdinalIgnoreCase)) continue;

            string? imei = null, sim = null;
            if (sixSenseCol is not null)
            {
                var raw = CellString(row, sixSenseCol);
                if (!string.IsNullOrWhiteSpace(raw))
                {
                    var parts = raw.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length > 0) imei = parts[0];
                    if (parts.Length > 1) sim = parts[1];
                }
            }

            result.Add(new ParsedVehicleRow(
                Vin: vin,
                VehicleId: CellString(row, vehicleIdCol),
                MotorId: CellString(row, motorCol),
                ControllerId: CellString(row, ctrlCol),
                VcuId: CellString(row, vcuCol),
                McuId: CellString(row, mcuCol),
                DiuNumber: CellString(row, diuCol),
                IotImei: imei,
                IotSim: sim,
                ItemCode: CellString(row, itemCodeCol),
                ItemName: CellString(row, itemNameCol),
                ProductionDate: CellDate(row, prodCol),
                CustomerVendor: CellString(row, custCol),
                RegistrationNumber: CellString(row, regNoCol),
                RegistrationDate: CellDate(row, regDtCol),
                PolicyNumber: CellString(row, polCol),
                InsuranceInvoiceNumber: CellString(row, insInvCol)));
        }
        return result;
    }

    /// Insurance Excel: VIN ↔ Policy Number rows.
    public static IReadOnlyList<(string Vin, string PolicyNumber)> ParseInsurance(Stream xlsxStream)
    {
        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheets.FirstOrDefault();
        if (ws is null) return Array.Empty<(string, string)>();
        var headers = ReadHeaders(ws);
        var vinCol = FindCol(headers, "vin");
        var polCol = FindCol(headers, "policy", "pol no", "pol.no");
        if (vinCol is null || polCol is null) return Array.Empty<(string, string)>();
        var list = new List<(string, string)>();
        var firstDataRow = ws.FirstRowUsed()!.RowNumber() + 1;
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
        for (int rn = firstDataRow; rn <= lastRow; rn++)
        {
            var row = ws.Row(rn);
            var vin = CellString(row, vinCol); var pol = CellString(row, polCol);
            if (vin is null || pol is null) continue;
            if (string.Equals(vin, "VIN ID", StringComparison.OrdinalIgnoreCase)) continue;
            list.Add((vin, pol));
        }
        return list;
    }

    /// RTO Excel: VIN ↔ Registration Number rows.
    public static IReadOnlyList<(string Vin, string RegistrationNumber)> ParseRto(Stream xlsxStream)
    {
        using var wb = new XLWorkbook(xlsxStream);
        var ws = wb.Worksheets.FirstOrDefault();
        if (ws is null) return Array.Empty<(string, string)>();
        var headers = ReadHeaders(ws);
        var vinCol = FindCol(headers, "vin");
        var regCol = FindCol(headers, "registration", "reg no", "reg.no", "regn");
        if (vinCol is null || regCol is null) return Array.Empty<(string, string)>();
        var list = new List<(string, string)>();
        var firstDataRow = ws.FirstRowUsed()!.RowNumber() + 1;
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
        for (int rn = firstDataRow; rn <= lastRow; rn++)
        {
            var row = ws.Row(rn);
            var vin = CellString(row, vinCol); var reg = CellString(row, regCol);
            if (vin is null || reg is null) continue;
            if (string.Equals(vin, "VIN ID", StringComparison.OrdinalIgnoreCase)) continue;
            list.Add((vin, reg));
        }
        return list;
    }
}
