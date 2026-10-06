import { ForbiddenError, ValidationError } from "../../errors";
import {
  ensureAdminOnly,
  ensureAdminOrCoordinator,
  normalizeAccessRole,
  validateAdminUserListQuery,
  validateCreateAdminUserDto,
  validateUpdateAdminSettingsDto,
} from "../../validators/admin.validator";

describe("AdminValidator", () => {
  it("should_validate_user_list_defaults", () => {
    const result = validateAdminUserListQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      role: undefined,
      active: undefined,
      hubId: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_create_user_payload", () => {
    const result = validateCreateAdminUserDto({
      name: "Admin",
      email: "ADMIN@MSPL.IN",
      mobile: "9999999999",
      role: "admin",
      hubIds: ["hub-1", "hub-2", "hub-1"],
      password: "Str0ng!Pass",
    });
    expect(result.email).toBe("admin@mspl.in");
    expect(result.hubIds).toEqual(["hub-1", "hub-2"]);
  });

  it("should_validate_settings_payload", () => {
    const result = validateUpdateAdminSettingsDto({
      settings: [{ settingKey: "notifications.enabled", category: "Notification Settings", value: true }],
    });
    expect(result.settings[0].settingKey).toBe("notifications.enabled");
  });

  it("should_enforce_access_rules", () => {
    expect(normalizeAccessRole("admin")).toBe("ADMIN");
    expect(() => ensureAdminOrCoordinator("TECHNICIAN")).toThrow(ForbiddenError);
    expect(() => ensureAdminOnly("COORDINATOR")).toThrow(ForbiddenError);
    expect(() => ensureAdminOnly("SERVICE_MANAGER")).not.toThrow();
  });

  it("should_throw_for_invalid_payloads", () => {
    expect(() => validateCreateAdminUserDto({})).toThrow(ValidationError);
    expect(() => validateAdminUserListQuery({ sortOrder: "up" })).toThrow(ValidationError);
    expect(() => validateUpdateAdminSettingsDto({ settings: [] })).toThrow(ValidationError);
  });
});
