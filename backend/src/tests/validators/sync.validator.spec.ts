import { ValidationError } from "../../errors";
import { validateSyncHistoryQuery } from "../../validators/sync.validator";

describe("SyncValidator", () => {
  it("defaults the history limit when it is omitted", () => {
    expect(validateSyncHistoryQuery({})).toEqual({ limit: 20 });
    expect(validateSyncHistoryQuery(undefined)).toEqual({ limit: 20 });
  });

  it.each(["invalid", 0, 201, 1.5])("rejects an invalid limit of %p", (limit) => {
    expect(() => validateSyncHistoryQuery({ limit })).toThrow(ValidationError);
  });

  it("accepts inclusive history limit bounds", () => {
    expect(validateSyncHistoryQuery({ limit: "1" })).toEqual({ limit: 1 });
    expect(validateSyncHistoryQuery({ limit: "200" })).toEqual({ limit: 200 });
  });
});
