import { ValidationError } from "../../errors";
import { validateExportFormat, validateReportQuery } from "../../validators/report.validator";

describe("ReportValidator", () => {
  it("should_validate_defaults", () => {
    const result = validateReportQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      hubId: undefined,
      vehicleModelId: undefined,
      vehicle: undefined,
      technicianId: undefined,
      customerId: undefined,
      rider: undefined,
      status: undefined,
      category: undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_date_range_and_export_format", () => {
    const query = validateReportQuery({
      dateFrom: "2026-01-01T00:00:00.000Z",
      dateTo: "2026-02-01T00:00:00.000Z",
      sortOrder: "asc",
    });
    expect(query.sortOrder).toBe("asc");
    expect(validateExportFormat("csv")).toBe("CSV");
  });

  it("should_throw_for_invalid_query", () => {
    expect(() => validateReportQuery({ page: 0 })).toThrow(ValidationError);
    expect(() =>
      validateReportQuery({
        dateFrom: "2026-03-01T00:00:00.000Z",
        dateTo: "2026-02-01T00:00:00.000Z",
      })
    ).toThrow(ValidationError);
    expect(() => validateExportFormat("xml")).toThrow(ValidationError);
  });
});
