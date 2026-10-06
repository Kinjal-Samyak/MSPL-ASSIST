import { CustomerModuleRepository } from "../../repositories/customer-module.repository";

describe("CustomerModuleRepository", () => {
  it("searches Rider Name and every Rider phone-number field", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const repository = new CustomerModuleRepository({
      $transaction: jest.fn().mockImplementation(async (operations) => Promise.all(operations)),
      customer: { findMany, count, groupBy: jest.fn().mockResolvedValue([]) },
    } as any);

    await repository.findCustomers({
      page: 1,
      pageSize: 10,
      search: "9876543210",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { registeredMobile: { contains: "9876543210", mode: "insensitive" } },
            { alternateMobile: { contains: "9876543210", mode: "insensitive" } },
            { whatsAppNumber: { contains: "9876543210", mode: "insensitive" } },
          ]),
        }),
      })
    );
    expect(findMany.mock.calls[0][0].where.OR).not.toContainEqual({ id: { equals: "9876543210" } });
  });

  it("includes the Rider ID condition only for a UUID search", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new CustomerModuleRepository({
      $transaction: jest.fn().mockImplementation(async (operations) => Promise.all(operations)),
      customer: { findMany, count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    } as any);
    const id = "0ccdc422-b6b2-425e-872b-c7536da73e35";

    await repository.findCustomers({ page: 1, pageSize: 10, search: id, sortBy: "updatedAt", sortOrder: "desc" });

    expect(findMany.mock.calls[0][0].where.OR).toContainEqual({ id: { equals: id } });
  });
});
