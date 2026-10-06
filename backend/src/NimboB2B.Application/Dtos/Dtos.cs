using System.Text.Json.Serialization;
using NimboB2B.Domain.Enums;

namespace NimboB2B.Application.Dtos;

// ── Auth ─────────────────────────────────────────────────────────────────
public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, UserDto User);
public record UserDto(Guid Id, string Email, string? Name, List<string> Roles);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// ── Orders ───────────────────────────────────────────────────────────────
public record CreateOrderRequest(
    string? Client_Id, string Client_Name, string Pi_Type, string? Funded_By, string? Finance_Partner,
    int Quantity, string State, string? City, string? Gst_Number, string? Contact_Person, string? Notes,
    string? Etd, string? Hypothecation_Name);

public record UpdateOrderRequest(
    string? Client_Id, string? Pi_Type, int Quantity, string? State, string? City,
    string? Gst_Number, string? Contact_Person, string? Finance_Partner, string? Funded_By,
    string? Hypothecation_Name, string? Etd, string? Notes);

public record OrderSummaryDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("client_name")] string ClientName,
    [property: JsonPropertyName("pi_type")] string PiType,
    [property: JsonPropertyName("quantity")] int Quantity,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("state_code")] string? StateCode,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("etd")] string? Etd,
    [property: JsonPropertyName("hypothecation_name")] string? HypothecationName,
    [property: JsonPropertyName("client_id")] Guid? ClientId,
    [property: JsonPropertyName("master_order_group_id")] Guid? MasterOrderGroupId,
    [property: JsonPropertyName("master_order_group_code")] string? MasterOrderGroupCode,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt,
    [property: JsonPropertyName("progress")] ProgressDto Progress);

public record ProgressDto(
    [property: JsonPropertyName("total")] int Total,
    [property: JsonPropertyName("uploaded")] int Uploaded,
    [property: JsonPropertyName("pct")] int Pct,
    [property: JsonPropertyName("steps_completed")] int StepsCompleted,
    [property: JsonPropertyName("steps_total")] int StepsTotal)
{
    public ProgressDto(int total, int uploaded, int pct)
        : this(total, uploaded, pct, 0, 8) { }
}

public record CreateOrderResponse(string OrderId);

// ── Clients ──────────────────────────────────────────────────────────────
public record CreateClientRequest(
    string Client_Name, string? Client_Number, string? Email,
    string State, string City, string Gst_Number);

public record UpdateClientRequest(
    string? Client_Number, string? Email, string? State, string? City, string? Gst_Number);

public record MapOrdersRequest(List<string> Order_Ids);

// ── Vehicles ─────────────────────────────────────────────────────────────
public record AssignmentEventDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("vehicle_vin")] string VehicleVin,
    [property: JsonPropertyName("order_id")] string? OrderId,
    [property: JsonPropertyName("event_type")] string EventType,
    [property: JsonPropertyName("previous_order_id")] string? PreviousOrderId,
    [property: JsonPropertyName("actor_user_id")] Guid? ActorUserId,
    [property: JsonPropertyName("actor_name")] string? ActorName,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt);

public record UnassignRequest(string OrderId);

// ── Insurance ────────────────────────────────────────────────────────────
public record FilePayload(string FileName, string FileBase64, long FileSize);

public record AddInsuranceRequest(
    string? OrderId, string PolicyNumber, string StartDate, string EndDate,
    string? Notes, FilePayload File);

public record UpdateInsuranceDatesRequest(string StartDate, string EndDate);

// ── Stage docs / stage ops ───────────────────────────────────────────────
public record StageDocUploadRequest(string FileName, string FileBase64, long FileSize, string? Notes);
public record FileOnlyRequest(FilePayload File);
public record BulkZipRequest(FilePayload File);
public record MatchPreviewRequest(List<string> FileNames);
public record MatchConfirmRequest(List<FilePayload> Files);
public record FormUploadRequest(string FormType, FilePayload File);
public record MiscUploadRequest(string DocumentName, FilePayload File);
public record SkipStageRequest(string StageId, string? Reason);
public record BillingNoteRequest(string Notes);
public record PdiUploadRequest(bool IsLowSpeed, string FileName, string FileBase64, long FileSize);
