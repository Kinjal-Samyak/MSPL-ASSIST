import { NotFoundError, ValidationError } from "../../errors";
import {
  assertCustomerExists,
  validateCustomerIdParam,
  validateCustomerSearchQuery,
  validateIssueSubcategoryQuery,
  validateTechnicianLookupQuery,
} from "../../validators/lookup.validator";

describe("LookupValidator", () => {
  it("should_validate_customer_search_query_defaults", () => {
    const result = validateCustomerSearchQuery({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
    });
  });

  it("should_validate_technician_lookup_query", () => {
    const result = validateTechnicianLookupQuery({
      hub: "Kolkata",
      availability: "busy",
    });

    expect(result).toEqual({
      hub: "Kolkata",
      availability: "BUSY",
    });
  });

  it("should_validate_issue_subcategory_query", () => {
    const result = validateIssueSubcategoryQuery({
      issueCategoryId: "issue-1",
    });

    expect(result).toEqual({
      issueCategoryId: "issue-1",
    });
  });

  it("should_throw_validation_error_for_empty_customer_id", () => {
    expect(() => validateCustomerIdParam(" ")).toThrow(ValidationError);
  });

  it("should_throw_not_found_when_customer_not_found", () => {
    expect(() => assertCustomerExists(null, "cust-1")).toThrow(NotFoundError);
  });
});
