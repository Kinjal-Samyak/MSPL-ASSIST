import bcrypt from "bcryptjs";
import { ConflictError, ForbiddenError } from "../../errors";
import { SetupService } from "../../services/setup.service";

describe("SetupService", () => {
  it("should_block_bootstrap_when_system_already_initialized", async () => {
    const repository = {
      countUsers: jest.fn().mockResolvedValue(1),
      findUserByEmail: jest.fn(),
      createInitialAdmin: jest.fn(),
    } as any;

    const service = new SetupService(repository);

    await expect(
      service.bootstrap({
        companyName: "MSPL Assist",
        adminName: "Admin User",
        email: "admin@mspl.in",
        password: "Secret123!",
        confirmPassword: "Secret123!",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("should_block_bootstrap_when_email_exists", async () => {
    const repository = {
      countUsers: jest.fn().mockResolvedValue(0),
      findUserByEmail: jest.fn().mockResolvedValue({ id: "user-1" }),
      createInitialAdmin: jest.fn(),
    } as any;

    const service = new SetupService(repository);

    await expect(
      service.bootstrap({
        companyName: "MSPL Assist",
        adminName: "Admin User",
        email: "admin@mspl.in",
        password: "Secret123!",
        confirmPassword: "Secret123!",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("should_create_initial_admin_when_system_is_empty", async () => {
    const repository = {
      countUsers: jest.fn().mockResolvedValue(0),
      findUserByEmail: jest.fn().mockResolvedValue(null),
      createInitialAdmin: jest.fn().mockResolvedValue({
        userId: "user-1",
        initializedAt: new Date("2026-07-13T00:00:00.000Z"),
      }),
    } as any;

    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as never);

    const service = new SetupService(repository);
    const result = await service.bootstrap({
      companyName: "MSPL Assist",
      adminName: "Admin User",
      email: "admin@mspl.in",
      password: "Secret123!",
      confirmPassword: "Secret123!",
    });

    expect(repository.createInitialAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: "MSPL Assist",
        adminName: "Admin User",
        email: "admin@mspl.in",
        passwordHash: "hashed-password",
      })
    );
    expect(result).toMatchObject({
      status: "SUCCESS",
      adminUserId: "user-1",
    });
  });
});

