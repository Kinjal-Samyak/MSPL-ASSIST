import { WorkshopWorkbenchRepository } from "../../repositories/workshop-workbench.repository";

describe("WorkshopWorkbenchRepository", () => {
  it("should_combine_hub_and_priority_filters_without_one_overwriting_the_other", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      jobCard: { findMany, count },
    } as any;
    const repository = new WorkshopWorkbenchRepository(prisma);

    await repository.list({ page: 1, pageSize: 10, hub: "Kolkata", priority: "HIGH" });

    const where = findMany.mock.calls[0][0].where;
    const ticketCondition = where.AND.find((clause: any) => clause.ticket);
    expect(ticketCondition.ticket.priority).toBe("HIGH");
    expect(ticketCondition.ticket.deployment.hub.name).toBe("Kolkata");
  });

  it("should_combine_a_status_filter_and_a_search_term_without_one_overwriting_the_other", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      jobCard: { findMany, count },
    } as any;
    const repository = new WorkshopWorkbenchRepository(prisma);

    await repository.list({ page: 1, pageSize: 10, status: "IN_PROGRESS", search: "MV-001" });

    const where = findMany.mock.calls[0][0].where;
    const statusCondition = where.AND[0];
    const searchCondition = where.AND.find((clause: any) => clause !== statusCondition && clause.OR);

    expect(statusCondition.OR).toEqual(
      expect.arrayContaining([{ workflowStage: "IN_PROGRESS", lastEditedAt: { not: null } }])
    );
    expect(searchCondition.OR).toEqual(
      expect.arrayContaining([{ jobCardNumber: { contains: "MV-001", mode: "insensitive" } }])
    );
  });

  it("should_query_open_job_cards_and_open_tickets_by_closedAt_null", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([3, 4, 1, 1, 0, 1, 2]),
      jobCard: { count: jest.fn().mockResolvedValue(0) },
      ticket: { count: jest.fn().mockResolvedValue(0) },
    } as any;
    const repository = new WorkshopWorkbenchRepository(prisma);

    const summary = await repository.getSummary();

    expect(summary).toEqual({
      openJobCards: 3,
      openTickets: 4,
      assignedToTechnician: 1,
      inProgress: 1,
      completed: 0,
      readyForDeployment: 1,
      returnedToWorkshop: 2,
    });
  });
});
