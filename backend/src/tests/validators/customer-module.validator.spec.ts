import { NotFoundError, ValidationError } from "../../errors";
import {
  assertCustomerModuleExists,
  validateCreateCustomerDto,
  validateCustomerDocumentQuery,
  validateCustomerModuleIdParam,
  validateCustomerListQuery,
  validateCustomerRentalHistoryQuery,
  validateCustomerTimelineQuery,
  validateDeactivateCustomerDto,
  validateUpdateCustomerDto,
} from "../../validators/customer-module.validator";

describe("CustomerModuleValidator", () => {
  it("should_validate_customer_list_query_defaults", () => {
    const result = validateCustomerListQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      status: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
      viewerRole: undefined,
      viewerUserId: undefined,
    });
  });

  it("should_validate_create_customer_payload", () => {
    const result = validateCreateCustomerDto({
      customerName: "Rider One",
      registeredMobile: "9876543210",
      email: "RIDER@MAIL.COM",
    });
    expect(result).toMatchObject({
      customerName: "Rider One",
      registeredMobile: "9876543210",
      email: "rider@mail.com",
    });
  });

  it("should_throw_for_invalid_list_sort_and_role", () => {
    expect(() => validateCustomerListQuery({ sortBy: "invalid" })).toThrow(ValidationError);
    expect(() => validateCustomerListQuery({ sortOrder: "up" })).toThrow(ValidationError);
    expect(() => validateCustomerListQuery({ viewerRole: "viewer" })).toThrow(ValidationError);
  });

  it("should_throw_for_invalid_list_pagination", () => {
    expect(() => validateCustomerListQuery({ page: 0 })).toThrow("page must be a positive integer.");
    expect(() => validateCustomerListQuery({ pageSize: 101 })).toThrow(
      "pageSize cannot be greater than 100."
    );
  });

  it("should_validate_customer_list_query_with_all_filters", () => {
    const result = validateCustomerListQuery({
      page: "2",
      pageSize: "20",
      search: " rider ",
      status: "active",
      sortBy: "name",
      sortOrder: "asc",
      viewerRole: "technician",
      viewerUserId: " tech-1 ",
    });
    expect(result).toEqual({
      page: 2,
      pageSize: 20,
      search: "rider",
      status: "ACTIVE",
      sortBy: "name",
      sortOrder: "asc",
      viewerRole: "TECHNICIAN",
      viewerUserId: "tech-1",
    });
  });

  it("should_throw_for_invalid_create_payload", () => {
    expect(() => validateCreateCustomerDto(null)).toThrow("Create rider payload must be an object.");
    expect(() =>
      validateCreateCustomerDto({
        customerName: "Rider One",
        registeredMobile: "98765ABCD0",
      })
    ).toThrow("registeredMobile must contain 10 to 15 digits.");
    expect(() =>
      validateCreateCustomerDto({
        customerName: "Rider One",
        registeredMobile: "9876543210",
        alternateMobile: "12A4",
      })
    ).toThrow("alternateMobile must contain 10 to 15 digits.");
    expect(() =>
      validateCreateCustomerDto({
        customerName: "Rider One",
        registeredMobile: "9876543210",
        email: "invalid-email",
      })
    ).toThrow("email must be a valid email address.");
  });

  it("should_throw_for_invalid_update_payload", () => {
    expect(() => validateUpdateCustomerDto({})).toThrow(ValidationError);
  });

  it("should_validate_update_payload_with_all_supported_fields", () => {
    const result = validateUpdateCustomerDto({
      customerName: " Rider Updated ",
      registeredMobile: "9998887776",
      alternateMobile: "9998887775",
      whatsAppNumber: "9998887774",
      email: "UPDATED@MAIL.COM",
      address: " HQ ",
      status: "inactive",
    });

    expect(result).toEqual({
      customerName: "Rider Updated",
      registeredMobile: "9998887776",
      alternateMobile: "9998887775",
      whatsAppNumber: "9998887774",
      email: "updated@mail.com",
      address: "HQ",
      status: "INACTIVE",
    });
  });

  it("should_throw_for_invalid_update_fields", () => {
    expect(() => validateUpdateCustomerDto({ registeredMobile: "1234567890A" })).toThrow(
      "registeredMobile must contain 10 to 15 digits."
    );
    expect(() => validateUpdateCustomerDto({ status: "ARCHIVED" })).toThrow(
      "status must be ACTIVE, INACTIVE, or SUSPENDED."
    );
  });

  it("should_validate_deactivate_payload", () => {
    const result = validateDeactivateCustomerDto({ reason: "Customer requested closure" });
    expect(result.reason).toBe("Customer requested closure");
  });

  it("should_throw_for_invalid_deactivate_payload", () => {
    expect(() => validateDeactivateCustomerDto(undefined)).toThrow(
      "Deactivate rider payload must be an object."
    );
    expect(() => validateDeactivateCustomerDto({ reason: "no" })).toThrow("reason is required.");
  });

  it("should_validate_customer_id_param", () => {
    expect(validateCustomerModuleIdParam(" cust-1 ")).toBe("cust-1");
    expect(() => validateCustomerModuleIdParam("")).toThrow("customerId is required.");
  });

  it("should_validate_timeline_query_defaults_and_bounds", () => {
    expect(validateCustomerTimelineQuery({})).toEqual({ page: 1, pageSize: 10 });
    expect(() => validateCustomerTimelineQuery({ page: -1 })).toThrow(
      "page must be a positive integer."
    );
  });

  it("should_validate_rental_history_query_and_status", () => {
    const result = validateCustomerRentalHistoryQuery({
      page: "3",
      pageSize: "15",
      rentalStatus: "maintenance",
      hub: " North ",
      search: " MH12 ",
    });
    expect(result).toEqual({
      page: 3,
      pageSize: 15,
      rentalStatus: "MAINTENANCE",
      hub: "North",
      search: "MH12",
    });
    expect(() => validateCustomerRentalHistoryQuery({ rentalStatus: "unknown" })).toThrow(
      "rentalStatus must be ACTIVE, PENDING, COMPLETED, or MAINTENANCE."
    );
  });

  it("should_validate_customer_document_query", () => {
    const result = validateCustomerDocumentQuery({ page: "2", pageSize: "5", fileType: " PDF " });
    expect(result).toEqual({ page: 2, pageSize: 5, fileType: "PDF" });
    expect(() => validateCustomerDocumentQuery(null)).toThrow(
      "Rider document query must be an object."
    );
  });

  it("should_not_throw_when_customer_exists", () => {
    expect(() => assertCustomerModuleExists({ id: "cust-1" }, "cust-1")).not.toThrow();
  });

  it("should_throw_not_found_when_customer_missing", () => {
    expect(() => assertCustomerModuleExists(null, "cust-1")).toThrow(NotFoundError);
  });
});
