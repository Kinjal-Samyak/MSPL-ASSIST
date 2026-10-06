import { ValidationError } from "../../errors";
import {
  validateAssignTechnicianDto,
  validateCreateTicketAttachmentDto,
  validateCreateTicketCommentDto,
  validateCreateTicketDto,
  validateTicketIdParam,
  validateTicketListQuery,
  validateUpdateTicketChargesDto,
  validateUpdateTicketEtaDto,
  validateUpdateTicketStatusDto,
} from "../../validators/ticket.validator";

describe("TicketCreateValidator", () => {
  it("should_validate_ticket_payload_and_apply_defaults", () => {
    const result = validateCreateTicketDto({
      registeredMobile: "+91 99999 88877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake not working",
    });

    expect(result).toMatchObject({
      registeredMobile: "919999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Brake not working",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: false,
    });
  });

  it("should_validate_all optional ticket fields", () => {
    const result = validateCreateTicketDto({
      registeredMobile: "9999988877",
      issueCategoryId: "issue-1",
      issueDescription: "Battery issue",
      source: "admin",
      priority: "high",
      estimatedCharges: "150",
      finalCharges: 125,
      coordinatorNotes: "  Inspect first  ",
      sendUpdate: "true",
      mvTrackNumber: " MV-001 ",
      vehicleNumber: " WB01AA0001 ",
      eta: "2026-07-11T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      source: "ADMIN",
      priority: "HIGH",
      estimatedCharges: 150,
      finalCharges: 125,
      coordinatorNotes: "Inspect first",
      sendUpdate: true,
      mvTrackNumber: "MV-001",
      vehicleNumber: "WB01AA0001",
      eta: "2026-07-11T12:00:00.000Z",
    });
  });

  it.each([
    { registeredMobile: "invalid", issueCategoryId: "issue-1", issueDescription: "Issue" },
    { registeredMobile: "9999988877", issueCategoryId: "issue-1", issueDescription: "Issue", estimatedCharges: -1 },
    { registeredMobile: "9999988877", issueCategoryId: "issue-1", issueDescription: "Issue", sendUpdate: "yes" },
    { registeredMobile: "9999988877", issueCategoryId: "issue-1", issueDescription: "Issue", eta: "not-a-date" },
  ])("should reject invalid ticket optional values", (input) => {
    expect(() => validateCreateTicketDto(input)).toThrow(ValidationError);
  });

  it("should_throw_validation_error_when_required_fields_are_missing", () => {
    expect(() =>
      validateCreateTicketDto({
        registeredMobile: "9999988877",
      })
    ).toThrow(ValidationError);
  });

  it("should_throw_validation_error_for_invalid_priority", () => {
    expect(() =>
      validateCreateTicketDto({
        registeredMobile: "9999988877",
        issueCategoryId: "issue-1",
        issueDescription: "Some issue details",
        priority: "INVALID",
      })
    ).toThrow(ValidationError);
  });

  it("should_validate_ticket_list_query_and_apply_defaults", () => {
    const query = validateTicketListQuery({});

    expect(query).toMatchObject({
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_ticket_list_query with all supported filters", () => {
    const query = validateTicketListQuery({
      page: "2",
      pageSize: "25",
      search: " MV-001 ",
      status: "Open",
      priority: "critical",
      hub: "Hub A",
      technician: "Tech One",
      category: "Battery",
      fromDate: "2026-07-01T00:00:00.000Z",
      toDate: "2026-07-31T00:00:00.000Z",
      sortBy: "priority",
      sortOrder: "asc",
    });

    expect(query).toMatchObject({
      page: 2,
      pageSize: 25,
      search: "MV-001",
      priority: "CRITICAL",
      sortBy: "priority",
      sortOrder: "asc",
    });
  });

  it.each([
    { page: 0 },
    { pageSize: 101 },
    { priority: "unknown" },
    { sortBy: "unknown" },
    { sortOrder: "up" },
    { fromDate: "invalid" },
  ])("should reject invalid ticket list filters", (input) => {
    expect(() => validateTicketListQuery(input)).toThrow(ValidationError);
  });

  it("should_throw_validation_error_for_invalid_date_range_in_list_query", () => {
    expect(() =>
      validateTicketListQuery({
        fromDate: "2026-07-10",
        toDate: "2026-07-09",
      })
    ).toThrow(ValidationError);
  });

  it("should_validate_ticket_id_param", () => {
    expect(validateTicketIdParam(" ticket-1 ")).toBe("ticket-1");
  });

  it("should_validate_create_comment_payload", () => {
    const result = validateCreateTicketCommentDto({
      commentType: "customer",
      text: "  updated from customer  ",
      userName: "  Coordinator  ",
      userRole: "  COORDINATOR  ",
    });

    expect(result).toEqual({
      commentType: "CUSTOMER",
      text: "updated from customer",
      userName: "Coordinator",
      userRole: "COORDINATOR",
    });
  });

  it.each([
    { commentType: "invalid", text: "Note" },
    { commentType: "INTERNAL", text: "" },
    { commentType: "INTERNAL", text: "x".repeat(2001) },
  ])("should reject invalid comment payload data", (input) => {
    expect(() => validateCreateTicketCommentDto(input)).toThrow();
  });

  it("should_validate_create_attachment_payload", () => {
    const result = validateCreateTicketAttachmentDto({
      fileName: "invoice.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      uploadedBy: "Coordinator",
    });

    expect(result).toEqual({
      fileName: "invoice.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      uploadedBy: "Coordinator",
    });
  });

  it.each([
    { fileName: "invoice.pdf", fileType: "text/plain", fileSize: 20, uploadedBy: "Coordinator" },
    { fileName: "invoice.pdf", fileType: "application/pdf", fileSize: 0, uploadedBy: "Coordinator" },
  ])("should reject invalid attachment data", (input) => {
    expect(() => validateCreateTicketAttachmentDto(input)).toThrow();
  });

  it("should_validate_assign_technician_payload", () => {
    const result = validateAssignTechnicianDto({
      technicianId: "tech-1",
      assignmentNotes: "Handle urgently",
    });

    expect(result).toEqual({
      technicianId: "tech-1",
      assignmentNotes: "Handle urgently",
    });
  });

  it("should_validate_status_update_payload", () => {
    const result = validateUpdateTicketStatusDto({
      status: "in progress",
      remarks: "Work started",
    });

    expect(result).toEqual({
      status: "In Progress",
      remarks: "Work started",
    });
  });

  it("should_validate_eta_update_payload", () => {
    const result = validateUpdateTicketEtaDto({
      eta: "2026-07-11T12:00:00.000Z",
      reason: "Part delayed",
    });

    expect(result.reason).toBe("Part delayed");
    expect(result.eta).toBe("2026-07-11T12:00:00.000Z");
  });

  it("should_validate_charges_update_payload", () => {
    const result = validateUpdateTicketChargesDto({
      labourCharges: 500,
      partsCharges: 300,
      discount: 100,
      totalCharges: 700,
    });

    expect(result).toEqual({
      labourCharges: 500,
      partsCharges: 300,
      discount: 100,
      totalCharges: 700,
    });
  });
});
