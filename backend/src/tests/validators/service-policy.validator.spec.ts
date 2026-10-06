import {
  validateCreatePriorityDefinition,
  validateUpdatePriorityDefinition,
  validateUpdateSlaStatusRule,
  validateUpdateStageSlaTarget,
  validateUpdateWorkshopSlaTarget,
  validateUpsertDefaultPriorityRule,
} from "../../validators/service-policy.validator";

describe("Service Policy validator", () => {
  it("normalizes a valid priority creation payload", () => {
    expect(validateCreatePriorityDefinition({ code: "p0", displayName: "Emergency", colorHex: "#000000", sortOrder: 5 })).toEqual({
      code: "P0",
      displayName: "Emergency",
      colorHex: "#000000",
      description: undefined,
      sortOrder: 5,
    });
  });
  it("rejects a priority creation payload without a code", () => {
    expect(() => validateCreatePriorityDefinition({ displayName: "Emergency", colorHex: "#000000", sortOrder: 5 })).toThrow("code is required.");
  });

  it("normalizes a partial priority update payload", () => {
    expect(validateUpdatePriorityDefinition({ active: false })).toEqual({
      displayName: undefined,
      colorHex: undefined,
      description: undefined,
      sortOrder: undefined,
      active: false,
    });
  });

  it("normalizes a valid default priority rule payload", () => {
    expect(validateUpsertDefaultPriorityRule({ condition: "VEHICLE_STOPPED", operator: "EQUALS", value: "true", priorityDefinitionId: "priority-1" })).toEqual({
      condition: "VEHICLE_STOPPED",
      operator: "EQUALS",
      value: "true",
      priorityDefinitionId: "priority-1",
      active: undefined,
    });
  });

  it("normalizes a valid Workshop SLA target payload", () => {
    expect(validateUpdateWorkshopSlaTarget({ durationValue: 4, durationUnit: "hours" })).toEqual({ durationValue: 4, durationUnit: "HOURS", active: undefined });
  });
  it("rejects an unknown durationUnit", () => {
    expect(() => validateUpdateWorkshopSlaTarget({ durationValue: 4, durationUnit: "DAYS" })).toThrow(/durationUnit must be one of/);
  });

  it("normalizes a valid Stage SLA target payload", () => {
    expect(validateUpdateStageSlaTarget({ durationValue: 30, durationUnit: "minutes" })).toEqual({ durationValue: 30, durationUnit: "MINUTES", active: undefined });
  });

  it("normalizes a valid SLA status rule payload", () => {
    expect(validateUpdateSlaStatusRule({ atRiskThresholdPct: 25 })).toEqual({ atRiskThresholdPct: 25 });
  });
  it("rejects an out-of-range atRiskThresholdPct", () => {
    expect(() => validateUpdateSlaStatusRule({ atRiskThresholdPct: 100 })).toThrow("atRiskThresholdPct must be an integer between 1 and 99.");
  });
});
