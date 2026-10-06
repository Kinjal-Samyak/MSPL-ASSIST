import { TicketService } from "../../services/ticket.service";

describe("TicketService conversation extension", () => {
  const payload = { registeredMobile: "9876543210", mvTrackNumber: "MVTEST002", rideabilityStatus: "NOT_MOVABLE" as const, issueGroups: [{ issueCategoryId: "battery", issueSubcategory: "Not Charging" }, { issueCategoryId: "brake", issueSubcategory: "Brake Noise" }], remarks: "Vehicle stopped", photoReferences: [{ fileUrl: "photo://one", fileType: "image/jpeg" }], conversationMetadata: { channel: "WEB" } };
  it("extends a legacy-created ticket with issue groups, photos, metadata and timeline", async () => {
    const tx = { ticket: { update: jest.fn() }, ticketIssueItem: { create: jest.fn() }, ticketAttachment: { create: jest.fn() }, ticketActivity: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn(async (fn: any) => fn(tx)) } as any;
    const service = new TicketService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service, "createTicket").mockResolvedValue({ existingTicket: false, ticketId: "ticket-1", ticketNumber: "MV-1", createdAt: new Date().toISOString() });
    await expect(service.createConversationTicket(payload)).resolves.toMatchObject({ ticketId: "ticket-1" });
    expect(tx.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rideabilityStatus: "NOT_MOVABLE", conversationMetadata: { channel: "WEB" } }) }));
    expect(tx.ticketIssueItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ issueCategoryId: "brake", issueSubcategory: "Brake Noise", sequenceNumber: 2 }) }));
    expect(tx.ticketAttachment.create).toHaveBeenCalledTimes(1); expect(tx.ticketActivity.create).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid rideability and missing issue groups without invoking legacy creation", async () => {
    const service = new TicketService({} as any, {} as any, {} as any, {} as any);
    const legacy = jest.spyOn(service, "createTicket");
    await expect(service.createConversationTicket({ ...payload, issueGroups: [] })).rejects.toThrow("At least one issue group");
    await expect(service.createConversationTicket({ ...payload, rideabilityStatus: "UNKNOWN" as any })).rejects.toThrow("Rideability status");
    expect(legacy).not.toHaveBeenCalled();
  });
});
