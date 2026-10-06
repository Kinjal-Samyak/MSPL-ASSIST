import { NotificationRepository } from "../../repositories/notification.repository";

describe("NotificationRepository", () => {
  it("should_return_notifications_list", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([
        [
          {
            id: "notif-1",
            ticketId: "ticket-1",
            templateId: null,
            eventType: "TICKET_CREATED",
            sourceModule: "TICKET",
            sourceEntityId: "ticket-1",
            channel: "WHATSAPP",
            recipient: "+919999999999",
            message: "Ticket created",
            status: "SENT",
            attemptCount: 1,
            errorMessage: null,
            readAt: null,
            archivedAt: null,
            responseId: "resp-1",
            sentAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        1,
      ]),
      notificationMessage: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    const repository = new NotificationRepository(prisma);
    const result = await repository.listNotifications({
      page: 1,
      pageSize: 10,
      search: undefined,
      channel: undefined,
      status: undefined,
      eventType: undefined,
      archived: false,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(result.totalRecords).toBe(1);
    expect(result.items[0].id).toBe("notif-1");
  });

  it("should_upsert_channel_settings", async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue(undefined),
      notificationChannelSetting: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "set-1",
            channel: "WHATSAPP",
            enabled: true,
            maxRetries: 3,
            updatedAt: new Date(),
          },
        ]),
      },
    } as any;
    const repository = new NotificationRepository(prisma);
    const result = await repository.upsertSettings({
      settings: [{ channel: "WHATSAPP", enabled: true, maxRetries: 3 }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe("WHATSAPP");
  });
});
