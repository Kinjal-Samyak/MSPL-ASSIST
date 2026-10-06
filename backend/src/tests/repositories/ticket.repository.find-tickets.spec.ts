import { TicketRepository } from "../../repositories/ticket.repository";

describe("TicketRepository - findTickets", () => {
  function buildPrismaMock() {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      ticket: { findMany, count },
      $transaction: jest.fn().mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any;
    return { prisma, findMany };
  }

  it("should_merge_hub_and_vehicleModel_into_a_single_deployment_clause_instead_of_overwriting_each_other", async () => {
    const { prisma, findMany } = buildPrismaMock();
    const repository = new TicketRepository(prisma);

    await repository.findTickets({
      page: 1,
      pageSize: 12,
      hub: "TARATALA",
      vehicleModel: "Activa",
      sortBy: "createdAt",
      sortOrder: "desc",
    } as any);

    const where = findMany.mock.calls[0][0].where;
    expect(where.deployment).toEqual({
      hub: { name: { contains: "TARATALA", mode: "insensitive" } },
      vehicleModel: { displayName: { contains: "Activa", mode: "insensitive" } },
    });
  });

  it("should_filter_by_vehicleTypeSnapshot_independently_of_the_deployment_relation", async () => {
    const { prisma, findMany } = buildPrismaMock();
    const repository = new TicketRepository(prisma);

    await repository.findTickets({
      page: 1,
      pageSize: 12,
      vehicleType: "Scooter",
      sortBy: "createdAt",
      sortOrder: "desc",
    } as any);

    const where = findMany.mock.calls[0][0].where;
    expect(where.vehicleTypeSnapshot).toEqual({ contains: "Scooter", mode: "insensitive" });
    expect(where.deployment).toBeUndefined();
  });
});
