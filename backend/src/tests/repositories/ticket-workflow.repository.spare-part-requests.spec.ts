import { TicketWorkflowRepository } from "../../repositories/ticket-workflow.repository";

describe("TicketWorkflowRepository - listAllSparePartRequests", () => {
  function buildPrismaMock() {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      jobCardSparePartRequest: { findMany, count },
      $transaction: jest.fn().mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as any;
    return { prisma, findMany };
  }

  it("should_filter_by_partCode_using_a_case_insensitive_contains_match", async () => {
    const { prisma, findMany } = buildPrismaMock();
    const repository = new TicketWorkflowRepository(prisma);

    await repository.listAllSparePartRequests({ page: 1, pageSize: 20, partCode: "MED800203" });

    const where = findMany.mock.calls[0][0].where;
    expect(where.part).toEqual({ partCode: { contains: "MED800203", mode: "insensitive" } });
  });

  it("should_combine_status_and_partCode_filters_when_both_are_provided", async () => {
    const { prisma, findMany } = buildPrismaMock();
    const repository = new TicketWorkflowRepository(prisma);

    await repository.listAllSparePartRequests({ page: 1, pageSize: 20, status: "APPROVED", partCode: "MED" });

    const where = findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      status: "APPROVED",
      part: { partCode: { contains: "MED", mode: "insensitive" } },
    });
  });

  it("should_select_jobCardNumber_so_the_Part_Requisitions_page_can_display_it", async () => {
    const { prisma, findMany } = buildPrismaMock();
    const repository = new TicketWorkflowRepository(prisma);

    await repository.listAllSparePartRequests({ page: 1, pageSize: 20 });

    const select = findMany.mock.calls[0][0].select;
    expect(select.jobCard.select.jobCardNumber).toBe(true);
  });
});
