import { AdminRepository } from "../../repositories/admin.repository";

describe("AdminRepository", () => {
  it("should_return_list_users_result", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([
        [
          {
            id: "user-1",
            name: "Admin User",
            email: "admin@mspl.in",
            mobile: "9999999999",
            role: "ADMIN",
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            userHubs: [{ hub: { id: "hub-1", name: "Kolkata" } }],
          },
        ],
        1,
      ]),
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const repository = new AdminRepository(prisma);
    const result = await repository.listUsers({
      page: 1,
      pageSize: 10,
      search: undefined,
      role: undefined,
      active: undefined,
      hubId: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    expect(result.totalRecords).toBe(1);
    expect(result.items[0].email).toBe("admin@mspl.in");
  });

  it("should_exclude_soft_deleted_users_from_the_user_list", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn().mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations)),
      user: { findMany, count },
    } as any;

    const repository = new AdminRepository(prisma);
    await repository.listUsers({
      page: 1,
      pageSize: 10,
      search: undefined,
      role: undefined,
      active: undefined,
      hubId: undefined,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });

    expect(findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
    expect(count.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
  });

  it("should_not_find_a_soft_deleted_user_by_id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { user: { findFirst } } as any;

    const repository = new AdminRepository(prisma);
    await repository.findUserById("user-1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1", deletedAt: null } })
    );
  });

  it("should_set_deletedAt_and_active_false_on_soft_delete", async () => {
    const update = jest.fn().mockResolvedValue({ id: "user-1" });
    const prisma = { user: { update } } as any;

    const repository = new AdminRepository(prisma);
    await repository.softDeleteUser("user-1");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { deletedAt: expect.any(Date), active: false },
      })
    );
  });

  it("should_upsert_settings", async () => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb: any) =>
        cb({
          appSetting: {
            upsert: jest.fn().mockResolvedValue(undefined),
            findMany: jest.fn().mockResolvedValue([
              {
                id: "set-1",
                settingKey: "notifications.customerUpdatesEnabled",
                category: "Notification Settings",
                value: true,
                editableByAdmin: true,
                updatedAt: new Date(),
                createdAt: new Date(),
                updatedById: null,
              },
            ]),
          },
        })
      ),
    } as any;

    const repository = new AdminRepository(prisma);
    const result = await repository.upsertSettings([
      {
        settingKey: "notifications.customerUpdatesEnabled",
        category: "Notification Settings",
        value: true,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].settingKey).toBe("notifications.customerUpdatesEnabled");
  });
});
