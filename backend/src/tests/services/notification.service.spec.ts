import { NotFoundError, UnprocessableEntityError } from "../../errors";
import { NotificationService } from "../../services/notification.service";

describe("NotificationService", () => {
  it("should_return_dashboard", async () => {
    const repository = {
      getDashboardCounts: jest.fn().mockResolvedValue({
        totalNotifications: 2,
        pendingNotifications: 0,
        sentNotifications: 2,
        failedNotifications: 0,
        unreadNotifications: 1,
        archivedNotifications: 0,
        totalTemplates: 1,
        activeChannels: 4,
      }),
    } as any;
    const service = new NotificationService(repository);
    const result = await service.getDashboard();
    expect(result.totalNotifications).toBe(2);
  });

  it("should_send_notification_when_source_exists", async () => {
    const repository = {
      sourceRecordExists: jest.fn().mockResolvedValue(true),
      listSettings: jest.fn().mockResolvedValue([
        { id: "s1", channel: "WHATSAPP", enabled: true, maxRetries: 3, updatedAt: new Date() },
      ]),
      createNotificationLog: jest.fn().mockResolvedValue({
        id: "notif-1",
        updatedAt: new Date(),
      }),
    } as any;
    const service = new NotificationService(repository);
    const result = await service.sendNotification({
      eventType: "TICKET_CREATED",
      sourceModule: "TICKET",
      sourceEntityId: "ticket-1",
      channel: "WHATSAPP",
      recipient: "+919999999999",
      message: "Ticket created",
    });
    expect(result.status).toBe("SUCCESS");
    expect(repository.createNotificationLog).toHaveBeenCalled();
  });

  it("should_throw_when_source_missing", async () => {
    const repository = {
      sourceRecordExists: jest.fn().mockResolvedValue(false),
    } as any;
    const service = new NotificationService(repository);
    await expect(
      service.sendNotification({
        eventType: "TICKET_CREATED",
        sourceModule: "TICKET",
        sourceEntityId: "ticket-unknown",
        channel: "WHATSAPP",
        recipient: "+919999999999",
        message: "Ticket created",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("should_throw_when_event_source_invalid", async () => {
    const repository = {} as any;
    const service = new NotificationService(repository);
    await expect(
      service.sendNotification({
        eventType: "TICKET_CREATED",
        sourceModule: "CUSTOMER",
        sourceEntityId: "customer-1",
        channel: "WHATSAPP",
        recipient: "+919999999999",
        message: "Ticket created",
      })
    ).rejects.toThrow(UnprocessableEntityError);
  });

  it("should_allow_user_updated_event_for_admin_source", async () => {
    const repository = {
      sourceRecordExists: jest.fn().mockResolvedValue(true),
      listSettings: jest.fn().mockResolvedValue([
        { id: "s1", channel: "EMAIL", enabled: true, maxRetries: 3, updatedAt: new Date() },
      ]),
      createNotificationLog: jest.fn().mockResolvedValue({
        id: "notif-2",
        updatedAt: new Date(),
      }),
    } as any;
    const service = new NotificationService(repository);
    const result = await service.sendNotification({
      eventType: "USER_UPDATED",
      sourceModule: "ADMIN",
      sourceEntityId: "user-1",
      channel: "EMAIL",
      recipient: "admin@msplassist.com",
      message: "User updated",
    });

    expect(result.status).toBe("SUCCESS");
    expect(repository.createNotificationLog).toHaveBeenCalled();
  });

  it("suppresses external delivery but retains an auditable notification record in Training", async () => {
    const repository = {
      sourceRecordExists: jest.fn().mockResolvedValue(true),
      listSettings: jest.fn().mockResolvedValue([
        { id: "s1", channel: "WHATSAPP", enabled: true, maxRetries: 3, updatedAt: new Date() },
      ]),
      createNotificationLog: jest.fn().mockResolvedValue({ id: "training-notification", updatedAt: new Date() }),
    } as any;
    const service = new NotificationService(repository, {
      name: "training",
      isTraining: true,
      trainingTestRecipients: [],
    });

    const result = await service.sendNotification({
      eventType: "TICKET_CREATED",
      sourceModule: "TICKET",
      sourceEntityId: "ticket-1",
      channel: "WHATSAPP",
      recipient: "+919999999999",
      message: "Training ticket created",
    });

    expect(result.message).toContain("suppressed in Training");
    expect(repository.createNotificationLog).toHaveBeenCalledWith(expect.objectContaining({
      status: "NOT_SENT",
    }));
  });

  it("allows real delivery in Training for an explicitly allowlisted test recipient", async () => {
    const repository = {
      sourceRecordExists: jest.fn().mockResolvedValue(true),
      listSettings: jest.fn().mockResolvedValue([
        { id: "s1", channel: "EMAIL", enabled: true, maxRetries: 3, updatedAt: new Date() },
      ]),
      createNotificationLog: jest.fn().mockResolvedValue({ id: "training-test-notification", updatedAt: new Date() }),
    } as any;
    const service = new NotificationService(repository, {
      name: "training",
      isTraining: true,
      trainingTestRecipients: ["tester@msplassist.local"],
    });

    const result = await service.sendNotification({
      eventType: "TICKET_CREATED",
      sourceModule: "TICKET",
      sourceEntityId: "ticket-1",
      channel: "EMAIL",
      recipient: "Tester@MsplAssist.local",
      message: "Training UAT verification",
    });

    expect(result.status).toBe("SUCCESS");
    expect(repository.createNotificationLog).toHaveBeenCalledWith(expect.objectContaining({
      status: "SENT",
    }));
  });
});
