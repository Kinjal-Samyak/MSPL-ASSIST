import bcrypt from "bcryptjs";

const { DEFAULT_ADMIN, upsertAdministrator } = require("../../../prisma/seed");

describe("administrator seed", () => {
  it("creates the default administrator with a bcrypt password hash", async () => {
    const client = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const result = await upsertAdministrator(client);

    expect(result).toBe("created");
    expect(client.user.upsert).toHaveBeenCalledTimes(1);
    const input = client.user.upsert.mock.calls[0][0];
    expect(input.where).toEqual({ email: "admin@msplassist.com" });
    expect(input.create).toMatchObject({
      name: "Administrator",
      email: "admin@msplassist.com",
      role: "ADMIN",
      active: true,
    });
    expect(input.create.passwordHash).not.toBe(DEFAULT_ADMIN.password);
    await expect(bcrypt.compare(DEFAULT_ADMIN.password, input.create.passwordHash)).resolves.toBe(true);
  });

  it("updates the existing administrator without creating another or resetting its password", async () => {
    const existingHash = await bcrypt.hash("custom-password", 4);
    const client = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ passwordHash: existingHash }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const result = await upsertAdministrator(client);

    expect(result).toBe("already-exists");
    expect(client.user.upsert).toHaveBeenCalledTimes(1);
    const input = client.user.upsert.mock.calls[0][0];
    expect(input.update).toEqual({
      name: "Administrator",
      passwordHash: existingHash,
      role: "ADMIN",
      active: true,
    });
    expect(input.create.email).toBe("admin@msplassist.com");
  });
});
