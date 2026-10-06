import { LookupRepository } from "../../repositories/lookup.repository";

describe("LookupRepository", () => {
  it("searches every customer contact number", async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      customer,
      $transaction: jest.fn().mockImplementation(async (operations: unknown[]) => Promise.all(operations)),
    } as any;
    const repository = new LookupRepository(prisma);

    await repository.searchCustomers({ page: 1, pageSize: 10, search: "9876543210" });

    expect(customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { registeredMobile: { contains: "9876543210", mode: "insensitive" } },
            { alternateMobile: { contains: "9876543210", mode: "insensitive" } },
            { whatsAppNumber: { contains: "9876543210", mode: "insensitive" } },
          ]),
        },
      })
    );
    expect(customer.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("does not compare free-text rider names with the UUID customer id", async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      customer,
      $transaction: jest.fn().mockImplementation(async (operations: unknown[]) => Promise.all(operations)),
    } as any;
    const repository = new LookupRepository(prisma);

    await repository.searchCustomers({ page: 1, pageSize: 10, search: "rahul das" });

    const where = customer.findMany.mock.calls[0][0].where;
    expect(where.OR).not.toContainEqual({ id: { equals: "rahul das" } });
  });

  it("includes an exact customer id match when the search value is a UUID", async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      customer,
      $transaction: jest.fn().mockImplementation(async (operations: unknown[]) => Promise.all(operations)),
    } as any;
    const repository = new LookupRepository(prisma);
    const customerId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

    await repository.searchCustomers({ page: 1, pageSize: 10, search: customerId });

    const where = customer.findMany.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ id: { equals: customerId } });
  });

  it("lists active technicians for a hub even when they have no earlier ticket assignments", async () => {
    const user = { findMany: jest.fn().mockResolvedValue([]) };
    const repository = new LookupRepository({ user } as any);

    await repository.findTechnicians({ hub: "Hub 1" });

    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: "TECHNICIAN",
          active: true,
        },
      })
    );
  });
});
