using NimboB2B.Domain.Enums;

namespace NimboB2B.Domain.Entities;

/// Application user (email + password + name). Roles live in <see cref="UserRole"/>.
public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Profile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Order
{
    public string Id { get; set; } = null!;
    public string ClientName { get; set; } = null!;
    public PiType PiType { get; set; }
    public string? FundedBy { get; set; }
    public string? FinancePartner { get; set; }
    public int Quantity { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? City { get; set; }
    public string? GstNumber { get; set; }
    public string? ContactPerson { get; set; }
    public string? Notes { get; set; }
    public Guid? ClientId { get; set; }
    public Guid? MasterOrderGroupId { get; set; }
    public DateOnly? Etd { get; set; }
    public string? HypothecationName { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// Client master record. Orders reference a client instead of duplicating
/// client details; legacy orders keep their free-text ClientName as a fallback.
public class Client
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClientName { get; set; } = null!;
    public string? ClientNumber { get; set; } // POC / client code
    public string? Email { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? GstNumber { get; set; }
    public string? GstFileName { get; set; }
    public long? GstFileSize { get; set; }
    public string? GstFilePath { get; set; } // storage-relative path
    public string? GstUploadedBy { get; set; }
    public DateTime? GstUploadedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// A client's overall requirement. All orders for a client belong to the
/// client's single master group; total requirement is the sum of child orders.
public class MasterOrderGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public string Code { get; set; } = null!; // e.g. MO-1001
    public string? PiReference { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// Immutable audit row for each ETD change on an order.
public class OrderEtdHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public DateOnly? PreviousEtd { get; set; }
    public DateOnly? NewEtd { get; set; }
    public Guid? ChangedBy { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime ChangedAt { get; set; }
}

/// Generic per-field change log for order edits.
public class OrderChangeLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string Field { get; set; } = null!;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public Guid? ChangedBy { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime ChangedAt { get; set; }
}

public class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? VehicleId { get; set; }
    public string Vin { get; set; } = null!;
    public string? MotorId { get; set; }
    public string? ControllerId { get; set; }
    public string? VcuId { get; set; }
    public string? McuId { get; set; }
    public string? DiuNumber { get; set; }
    public string? IotImei { get; set; }
    public string? IotSim { get; set; }
    public string? ItemCode { get; set; }
    public string? ItemName { get; set; }
    public DateOnly? ProductionDate { get; set; }
    public string? CustomerVendor { get; set; }
    public bool IsLowSpeed { get; set; }
    public string? RegistrationNumber { get; set; }
    public DateOnly? RegistrationDate { get; set; }
    public string? PolicyNumber { get; set; }
    public string? InsuranceInvoiceNumber { get; set; }
    public DateOnly? InsuranceStartDate { get; set; }
    public DateOnly? InsuranceEndDate { get; set; }
    public string? AssignedOrderId { get; set; }
    public string? AssignedClient { get; set; }
    public DateTime? AssignedAt { get; set; }
    public string? AssignedBy { get; set; }
    public bool VendorFlagged { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class StageDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string StageId { get; set; } = null!; // free-form string matches the frontend stage IDs
    public string DocumentName { get; set; } = null!;
    public string Status { get; set; } = "required";
    public string? FormType { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? FileUrl { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime? UploadedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class StageSkip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string StageId { get; set; } = null!;
    public string? Reason { get; set; }
    public string? SkippedBy { get; set; }
    public DateTime SkippedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class BillingNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string Notes { get; set; } = null!;
    public string? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PdiUpload
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string PdiType { get; set; } = "initial";
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public int VehicleCount { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FinalPdiVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string VehicleVin { get; set; } = null!;
    public string? VehicleId { get; set; }
    public string CheckType { get; set; } = null!;
    public string Status { get; set; } = "fail";
    public string? Expected { get; set; }
    public string? Actual { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class IndividualInvoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string VehicleVin { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class BulkInvoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class RtoSlip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string RegistrationNumber { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class RtoExcelUpload
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public int RowCount { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class InsurancePolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string PolicyNumber { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class InsuranceExcelUpload
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OrderId { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long FileSize { get; set; }
    public string FileUrl { get; set; } = null!;
    public int VehiclesUpdated { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class VehicleInsurancePolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string VehicleVin { get; set; } = null!;
    public string? OrderId { get; set; }
    public string? PolicyNumber { get; set; }
    public string? Provider { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? FileUrl { get; set; }
    public string? Notes { get; set; }
    public Guid? UploadedBy { get; set; }
    public string? UploadedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class VehicleAssignmentEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string VehicleVin { get; set; } = null!;
    public string? OrderId { get; set; }
    public AssignmentEventType EventType { get; set; }
    public string? PreviousOrderId { get; set; }
    public Guid? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
