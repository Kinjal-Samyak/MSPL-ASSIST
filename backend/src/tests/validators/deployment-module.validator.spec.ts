import { ValidationError } from "../../errors";
import {
  validateDeploymentIdParam,
  validateDeploymentListQuery,
  validateDeploymentQuery,
} from "../../validators/deployment-module.validator";

describe("DeploymentModuleValidator", () => {
  it("should_validate_deployment_list_defaults", () => {
    const result = validateDeploymentListQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      rentalStatus: undefined,
      hubName: undefined,
      modelCode: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_deployment_list_values", () => {
    const result = validateDeploymentListQuery({
      page: "2",
      pageSize: "20",
      rentalStatus: "active",
      sortBy: "customerName",
      sortOrder: "asc",
      search: "rider",
    });
    expect(result).toMatchObject({
      page: 2,
      pageSize: 20,
      rentalStatus: "ACTIVE",
      sortBy: "customerName",
      sortOrder: "asc",
    });
  });

  it("should_throw_on_invalid_deployment_list_values", () => {
    expect(() => validateDeploymentListQuery({ rentalStatus: "BAD" })).toThrow(ValidationError);
    expect(() => validateDeploymentListQuery({ sortBy: "bad" })).toThrow(ValidationError);
    expect(() => validateDeploymentListQuery({ sortOrder: "up" })).toThrow(ValidationError);
  });

  it("should_validate_deployment_id_param", () => {
    expect(validateDeploymentIdParam(" dep-1 ")).toBe("dep-1");
    expect(() => validateDeploymentIdParam("")).toThrow("deploymentId is required.");
  });

  it("should_validate_query", () => {
    expect(validateDeploymentQuery({ page: "1", pageSize: "10" })).toEqual({
      page: 1,
      pageSize: 10,
    });
  });
});
