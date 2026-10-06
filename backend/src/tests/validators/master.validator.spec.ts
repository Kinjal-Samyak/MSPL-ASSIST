import { validateMasterRequest } from "../../validators/master.validator";

describe("MasterValidator", () => {
  it("should_return_without_throwing_for_current_read_only_master_requests", () => {
    expect(() => validateMasterRequest()).not.toThrow();
  });
});
