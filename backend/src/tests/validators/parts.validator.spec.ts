import { validateConsumptionSummaryQuery, validateCreatePart, validateCreatePartAdjustment, validateCreatePartCategory, validatePartListQuery, validateTransactionListQuery, validateUpdatePartCategory, validateUploadHistoryListQuery } from "../../validators/parts.validator";

describe("Parts validator", () => {
  it("normalizes a valid Part Master payload", () => {
    expect(validateCreatePart({ partCode: " ctrl-01 ", partName: "Controller", categoryId: "category-1", unitOfMeasure: "EA", partCost: "2500", compatibleModels: [{ modelCode: "M7", modelName: "M7" }] })).toMatchObject({ partCode: "CTRL-01", partCost: 2500, minimumStock: 0, active: true });
  });
  it("rejects a negative Part Cost", () => { expect(() => validateCreatePart({ partCode: "P-1", partName: "Part", categoryId: "category-1", unitOfMeasure: "EA", partCost: -1, compatibleModels: [] })).toThrow("partCost must be a non-negative number."); });
  it("validates catalogue category and query filters", () => {
    expect(validateCreatePartCategory({ name: "Electrical" })).toEqual({ name: "Electrical", description: undefined, displayOrder: undefined });
    expect(validatePartListQuery({ search: "controller", active: "true" })).toEqual({ search: "controller", categoryId: undefined, active: true });
  });
  it("normalizes a valid Part category/compatibility update payload", () => {
    expect(validateUpdatePartCategory({ categoryId: "category-2", compatibleModels: [{ modelCode: "M7", modelName: "M7" }] })).toEqual({ categoryId: "category-2", compatibleModels: [{ modelCode: "M7", modelName: "M7" }] });
  });
  it("defaults compatibleModels to an empty array when omitted", () => {
    expect(validateUpdatePartCategory({ categoryId: "category-2" })).toEqual({ categoryId: "category-2", compatibleModels: [] });
  });
  it("rejects a Part category/compatibility update without a categoryId", () => {
    expect(() => validateUpdatePartCategory({ compatibleModels: [] })).toThrow("categoryId is required.");
  });

  it("normalizes a valid stock adjustment payload", () => {
    expect(validateCreatePartAdjustment({ quantityDelta: -5, reason: "Cycle count correction" })).toEqual({ quantityDelta: -5, reason: "Cycle count correction", hubId: undefined });
  });
  it("rejects a stock adjustment with a zero quantityDelta", () => {
    expect(() => validateCreatePartAdjustment({ quantityDelta: 0, reason: "x" })).toThrow("quantityDelta must be a non-zero integer.");
  });
  it("rejects a stock adjustment without a reason", () => {
    expect(() => validateCreatePartAdjustment({ quantityDelta: 5 })).toThrow("reason is required.");
  });

  it("normalizes a valid transaction list query with defaults", () => {
    expect(validateTransactionListQuery({})).toEqual({ page: 1, pageSize: 20, partId: undefined, transactionType: undefined, hubId: undefined, technicianId: undefined, jobCardId: undefined, dateFrom: undefined, dateTo: undefined });
  });
  it("rejects an unknown transactionType filter", () => {
    expect(() => validateTransactionListQuery({ transactionType: "NOT_A_TYPE" })).toThrow(/transactionType must be one of/);
  });

  it("normalizes a valid consumption summary query", () => {
    expect(validateConsumptionSummaryQuery({ groupBy: "hub" })).toEqual({ groupBy: "HUB", dateFrom: undefined, dateTo: undefined, hubId: undefined });
  });
  it("rejects an unknown groupBy value", () => {
    expect(() => validateConsumptionSummaryQuery({ groupBy: "REGION" })).toThrow(/groupBy must be one of/);
  });
  it("rejects a consumption summary query without groupBy", () => {
    expect(() => validateConsumptionSummaryQuery({})).toThrow("groupBy is required.");
  });

  it("normalizes a valid upload history list query with defaults", () => {
    expect(validateUploadHistoryListQuery({})).toEqual({ page: 1, pageSize: 20, dateFrom: undefined, dateTo: undefined });
  });
  it("rejects a non-positive page for the upload history list query", () => {
    expect(() => validateUploadHistoryListQuery({ page: 0 })).toThrow("page must be a positive integer.");
  });
});
