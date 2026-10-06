using NimboB2B.Domain.Entities;
using NimboB2B.Infrastructure.Storage;

namespace NimboB2B.Application.Services;

/// Read-time projections for every entity that carries a stored file.
/// The database holds only the storage-relative path (e.g.
/// "nimbo-files/stage-docs/APX-001-DLP/pi/&lt;id&gt;-file.pdf"); the absolute,
/// signed download URL is built here from Storage:PublicBaseUrl on each read.
public static class FileWire
{
    public static readonly TimeSpan LinkLifetime = TimeSpan.FromDays(365);

    /// Builds a fresh signed URL for a stored value. Tolerates legacy rows that
    /// still contain a full absolute URL by normalising them back to a path.
    public static string? Url(IFileStore files, string? stored, string? displayName = null)
    {
        if (string.IsNullOrWhiteSpace(stored)) return null;
        var relative = files.NormalizePath(stored);
        return string.IsNullOrWhiteSpace(relative)
            ? null
            : files.CreateDownloadUrl(relative, LinkLifetime, displayName);
    }

    /// The storage-relative path, exposed so the UI can mint a fresh signed
    /// link at click time instead of reusing one from cached page data.
    public static string? Path(IFileStore files, string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return null;
        var relative = files.NormalizePath(stored);
        return string.IsNullOrWhiteSpace(relative) ? null : relative;
    }

    public static object PdiUploadToWire(IFileStore f, PdiUpload p) => new
    {
        id = p.Id,
        order_id = p.OrderId,
        pdi_type = p.PdiType,
        file_name = p.FileName,
        file_size = p.FileSize,
        file_url = Url(f, p.FileUrl, p.FileName),
        file_path = Path(f, p.FileUrl),
        vehicle_count = p.VehicleCount,
        uploaded_by = p.UploadedBy,
        uploaded_at = p.UploadedAt,
    };

    public static object BulkInvoiceToWire(IFileStore f, BulkInvoice b) => new
    {
        id = b.Id,
        order_id = b.OrderId,
        file_name = b.FileName,
        file_size = b.FileSize,
        file_url = Url(f, b.FileUrl, b.FileName),
        file_path = Path(f, b.FileUrl),
        uploaded_by = b.UploadedBy,
        uploaded_at = b.UploadedAt,
    };

    public static object IndividualInvoiceToWire(IFileStore f, IndividualInvoice i) => new
    {
        id = i.Id,
        order_id = i.OrderId,
        vehicle_vin = i.VehicleVin,
        file_name = i.FileName,
        file_size = i.FileSize,
        file_url = Url(f, i.FileUrl, i.FileName),
        file_path = Path(f, i.FileUrl),
        uploaded_by = i.UploadedBy,
        uploaded_at = i.UploadedAt,
    };

    public static object RtoSlipToWire(IFileStore f, RtoSlip r) => new
    {
        id = r.Id,
        order_id = r.OrderId,
        registration_number = r.RegistrationNumber,
        file_name = r.FileName,
        file_size = r.FileSize,
        file_url = Url(f, r.FileUrl, r.FileName),
        file_path = Path(f, r.FileUrl),
        uploaded_by = r.UploadedBy,
        uploaded_at = r.UploadedAt,
    };

    public static object RtoExcelToWire(IFileStore f, RtoExcelUpload r) => new
    {
        id = r.Id,
        order_id = r.OrderId,
        file_name = r.FileName,
        file_size = r.FileSize,
        file_url = Url(f, r.FileUrl, r.FileName),
        file_path = Path(f, r.FileUrl),
        row_count = r.RowCount,
        uploaded_by = r.UploadedBy,
        uploaded_at = r.UploadedAt,
    };

    public static object InsurancePolicyToWire(IFileStore f, InsurancePolicy p) => new
    {
        id = p.Id,
        order_id = p.OrderId,
        policy_number = p.PolicyNumber,
        file_name = p.FileName,
        file_size = p.FileSize,
        file_url = Url(f, p.FileUrl, p.FileName),
        file_path = Path(f, p.FileUrl),
        uploaded_by = p.UploadedBy,
        uploaded_at = p.UploadedAt,
    };

    public static object InsuranceExcelToWire(IFileStore f, InsuranceExcelUpload p) => new
    {
        id = p.Id,
        order_id = p.OrderId,
        file_name = p.FileName,
        file_size = p.FileSize,
        file_url = Url(f, p.FileUrl, p.FileName),
        file_path = Path(f, p.FileUrl),
        vehicles_updated = p.VehiclesUpdated,
        uploaded_by = p.UploadedBy,
        uploaded_at = p.UploadedAt,
    };

    public static object VehicleInsurancePolicyToWire(IFileStore f, VehicleInsurancePolicy p) => new
    {
        id = p.Id,
        vehicle_vin = p.VehicleVin,
        order_id = p.OrderId,
        policy_number = p.PolicyNumber,
        provider = p.Provider,
        start_date = p.StartDate.ToString("yyyy-MM-dd"),
        end_date = p.EndDate.ToString("yyyy-MM-dd"),
        is_current = p.IsCurrent,
        file_name = p.FileName,
        file_size = p.FileSize,
        file_url = Url(f, p.FileUrl, p.FileName),
        file_path = Path(f, p.FileUrl),
        notes = p.Notes,
        uploaded_by = p.UploadedBy,
        uploaded_by_name = p.UploadedByName,
        created_at = p.CreatedAt,
    };
}
