import { ValidationError } from "../../errors";
import {
  validateVehicleDocumentQuery,
  validateVehicleIdParam,
  validateVehicleListQuery,
  validateVehicleTimelineQuery,
} from "../../validators/vehicle.validator";

describe("VehicleValidator", () => {
  it("should_validate_vehicle_list_query_defaults", () => {
    const result = validateVehicleListQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      status: undefined,
      hubName: undefined,
      modelCode: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_vehicle_list_query_values", () => {
    const result = validateVehicleListQuery({
      page: "2",
      pageSize: "20",
      status: "available",
      sortBy: "vehicleNumber",
      sortOrder: "asc",
      hubName: "Kolkata",
      modelCode: "M-1",
      search: "WB12",
    });
    expect(result).toMatchObject({
      page: 2,
      pageSize: 20,
      status: "AVAILABLE",
      sortBy: "vehicleNumber",
      sortOrder: "asc",
    });
  });

  it("should_throw_on_invalid_list_query", () => {
    expect(() => validateVehicleListQuery({ sortBy: "bad" })).toThrow(ValidationError);
    expect(() => validateVehicleListQuery({ sortOrder: "up" })).toThrow(ValidationError);
    expect(() => validateVehicleListQuery({ status: "NA" })).toThrow(ValidationError);
  });

  it("should_validate_vehicle_id_param", () => {
    expect(validateVehicleIdParam(" MV-001 ")).toBe("MV-001");
    expect(() => validateVehicleIdParam("")).toThrow("vehicleId is required.");
  });

  it("should_validate_timeline_query", () => {
    expect(validateVehicleTimelineQuery({ page: "1", pageSize: "30" })).toEqual({ page: 1, pageSize: 30 });
    expect(() => validateVehicleTimelineQuery({ page: 0 })).toThrow(ValidationError);
  });

  it("should_validate_document_query", () => {
    expect(validateVehicleDocumentQuery({ page: "1", pageSize: "10", fileType: "pdf" })).toEqual({
      page: 1,
      pageSize: 10,
      fileType: "pdf",
    });
  });
});

