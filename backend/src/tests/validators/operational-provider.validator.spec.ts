import { ValidationError } from "../../errors";
import {
  validateCustomerId,
  validateMvTrackNumber,
  validateRiderName,
  validateRiderPhone,
  validateVin,
} from "../../validators/operational-provider.validator";

describe("OperationalProviderValidator", () => {
  it("should_validate_mv_track_number", () => {
    expect(validateMvTrackNumber(" MV-TRACK-01 ")).toBe("MV-TRACK-01");
  });

  it("should_throw_for_invalid_mv_track_number", () => {
    expect(() => validateMvTrackNumber(" ")).toThrow(ValidationError);
  });

  it("should_validate_vin_and_normalize_to_upper_case", () => {
    expect(validateVin("ma1ab12cd34ef5678")).toBe("MA1AB12CD34EF5678");
  });

  it("should_throw_for_invalid_vin_format", () => {
    expect(() => validateVin("INV@LID")).toThrow("vin must be alphanumeric.");
  });

  it("should_validate_phone", () => {
    expect(validateRiderPhone("9876543210")).toBe("9876543210");
  });

  it("should_throw_for_invalid_phone", () => {
    expect(() => validateRiderPhone("12345ABCD9")).toThrow("phone must contain 10 to 15 digits.");
  });

  it("should_validate_rider_name", () => {
    expect(validateRiderName(" Rider One ")).toBe("Rider One");
  });

  it("should_throw_for_invalid_rider_name", () => {
    expect(() => validateRiderName("A")).toThrow("name is required.");
  });

  it("should_validate_customer_id", () => {
    expect(validateCustomerId(" cust-1 ")).toBe("cust-1");
  });
});
