import { ConflictError, ForbiddenError, NotFoundError } from "../../errors";
import { AdminService } from "../../services/admin.service";

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: "user-1",
    name: "Admin User",
    email: "admin@mspl.in",
    mobile: "9999999999",
    role: "ADMIN",
    active: true,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T01:00:00.000Z"),
    userHubs: [{ hub: { id: "hub-1", name: "Kolkata" } }],
    ...overrides,
  };
}

describe("AdminService", () => {
  it("should_return_dashboard", async () => {
    const repository = {
      listRoles: jest.fn().mockResolvedValue(["ADMIN", "COORDINATOR", "TECHNICIAN"]),
      getDashboardCounts: jest.fn().mockResolvedValue({
        totalUsers: 2,
        activeUsers: 2,
        inactiveUsers: 0,
        totalRoles: 3,
        totalPermissions: 6,
        totalHubs: 1,
        totalSettings: 3,
      }),
    } as any;
    const service = new AdminService(repository);
    const result = await service.getDashboard("ADMIN");
    expect(result.totalUsers).toBe(2);
    expect(result.totalRoles).toBe(3);
  });

  it("should_block_technician_from_admin_module", async () => {
    const repository = {} as any;
    const service = new AdminService(repository);
    await expect(service.getUsers("TECHNICIAN", {})).rejects.toThrow(ForbiddenError);
  });

  it("should_block_coordinator_write_actions", async () => {
    const repository = {} as any;
    const service = new AdminService(repository);
    await expect(service.createUser("COORDINATOR", {})).rejects.toThrow(ForbiddenError);
  });

  it("should_throw_not_found_when_user_does_not_exist", async () => {
    const repository = {
      findUserById: jest.fn().mockResolvedValue(null),
    } as any;
    const service = new AdminService(repository);
    await expect(service.getUserById("ADMIN", "unknown-user")).rejects.toThrow(NotFoundError);
  });

  it("should_update_user", async () => {
    const repository = {
      findUserById: jest.fn().mockResolvedValue(makeUser()),
      updateUser: jest.fn().mockResolvedValue(makeUser({ name: "Updated User" })),
      listHubs: jest.fn().mockResolvedValue([{ id: "hub-1" }]),
    } as any;
    const service = new AdminService(repository);
    const result = await service.updateUser("ADMIN", "user-1", { name: "Updated User" });
    expect(result.status).toBe("SUCCESS");
  });

  it("should_allow_a_service_manager_write_action_now_that_it_inherits_admin_permissions", async () => {
    const repository = {
      findUserById: jest.fn().mockResolvedValue(makeUser()),
      updateUser: jest.fn().mockResolvedValue(makeUser({ name: "Updated User" })),
      listHubs: jest.fn().mockResolvedValue([{ id: "hub-1" }]),
    } as any;
    const service = new AdminService(repository);
    const result = await service.updateUser("SERVICE_MANAGER", "user-1", { name: "Updated User" });
    expect(result.status).toBe("SUCCESS");
  });

  it("should_delete_a_user", async () => {
    const repository = {
      findUserById: jest.fn().mockResolvedValue(makeUser()),
      softDeleteUser: jest.fn().mockResolvedValue(makeUser({ deletedAt: new Date() })),
    } as any;
    const service = new AdminService(repository);
    const result = await service.deleteUser("ADMIN", "user-1");
    expect(result.status).toBe("SUCCESS");
    expect(repository.softDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("should_block_deleting_your_own_account", async () => {
    const repository = { findUserById: jest.fn(), softDeleteUser: jest.fn() } as any;
    const service = new AdminService(repository);
    await expect(
      service.deleteUser("ADMIN", "user-1", { userId: "user-1" })
    ).rejects.toThrow(ConflictError);
    expect(repository.softDeleteUser).not.toHaveBeenCalled();
  });

  it("should_block_a_coordinator_from_deleting_a_user", async () => {
    const repository = { findUserById: jest.fn(), softDeleteUser: jest.fn() } as any;
    const service = new AdminService(repository);
    await expect(service.deleteUser("COORDINATOR", "user-1")).rejects.toThrow(ForbiddenError);
  });

  it("should_throw_not_found_when_deleting_a_user_that_does_not_exist", async () => {
    const repository = { findUserById: jest.fn().mockResolvedValue(null), softDeleteUser: jest.fn() } as any;
    const service = new AdminService(repository);
    await expect(service.deleteUser("ADMIN", "missing-user")).rejects.toThrow(NotFoundError);
    expect(repository.softDeleteUser).not.toHaveBeenCalled();
  });
});
