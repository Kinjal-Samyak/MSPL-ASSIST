import { ValidationError } from "../../errors";
import {
  validateAssignWorkshopJobDto,
  validateCreateWorkshopJobDto,
  validateUpdateWorkshopJobDto,
  validateWorkshopJobIdParam,
  validateWorkshopJobListQuery,
  validateWorkshopTimelineQuery,
} from "../../validators/workshop.validator";

describe("WorkshopValidator", () => {
  it("should_validate_job_list_defaults", () => {
    const result = validateWorkshopJobListQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      status: undefined,
      priority: undefined,
      technicianId: undefined,
      hubName: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_create_payload", () => {
    const result = validateCreateWorkshopJobDto({
      deploymentId: "dep-1",
      issueCategoryId: "cat-1",
      issueDescription: "Battery issue",
      priority: "high",
    });
    expect(result.priority).toBe("HIGH");
  });

  it("should_validate_update_payload", () => {
    const result = validateUpdateWorkshopJobDto({
      coordinatorNotes: "updated",
    });
    expect(result.coordinatorNotes).toBe("updated");
  });

  it("should_validate_assign_payload", () => {
    const result = validateAssignWorkshopJobDto({
      technicianId: "tech-1",
    });
    expect(result.technicianId).toBe("tech-1");
  });

  it("should_validate_timeline_query_and_job_id", () => {
    expect(validateWorkshopTimelineQuery({ page: "1", pageSize: "20" })).toEqual({ page: 1, pageSize: 20 });
    expect(validateWorkshopJobIdParam(" job-1 ")).toBe("job-1");
  });

  it("should_throw_on_invalid_values", () => {
    expect(() => validateWorkshopJobListQuery({ sortOrder: "up" })).toThrow(ValidationError);
    expect(() => validateCreateWorkshopJobDto({})).toThrow(ValidationError);
    expect(() => validateUpdateWorkshopJobDto({})).toThrow(ValidationError);
  });
});
