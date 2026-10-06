import { ValidationError } from "../../errors";
import {
  validateCreateNotificationTemplateDto,
  validateNotificationListQuery,
  validateSendNotificationDto,
  validateUpdateNotificationSettingsDto,
  validateUpdateNotificationTemplateDto,
} from "../../validators/notification.validator";

describe("NotificationValidator", () => {
  it("should_validate_notification_query_defaults", () => {
    const result = validateNotificationListQuery({});
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      channel: undefined,
      status: undefined,
      eventType: undefined,
      archived: undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("should_validate_send_payload", () => {
    const result = validateSendNotificationDto({
      eventType: "ticket_created",
      sourceModule: "ticket",
      sourceEntityId: "ticket-1",
      channel: "whatsapp",
      recipient: "+919999999999",
      message: "Ticket created",
    });
    expect(result.channel).toBe("WHATSAPP");
    expect(result.eventType).toBe("TICKET_CREATED");
  });

  it("should_accept_all_supported_admin_and_vehicle_events", () => {
    const adminResult = validateSendNotificationDto({
      eventType: "USER_UPDATED",
      sourceModule: "ADMIN",
      sourceEntityId: "user-1",
      channel: "EMAIL",
      recipient: "admin@msplassist.com",
      message: "User profile updated",
    });
    const vehicleResult = validateSendNotificationDto({
      eventType: "VEHICLE_ACTIVATED",
      sourceModule: "VEHICLE",
      sourceEntityId: "vehicle-1",
      channel: "SMS",
      recipient: "+919999999998",
      message: "Vehicle activated",
    });

    expect(adminResult.eventType).toBe("USER_UPDATED");
    expect(vehicleResult.eventType).toBe("VEHICLE_ACTIVATED");
  });

  it("should_validate_template_and_settings_payload", () => {
    const template = validateCreateNotificationTemplateDto({
      name: "Ticket Created WhatsApp",
      eventType: "TICKET_CREATED",
      channel: "WHATSAPP",
      content: "Ticket {{ticketNumber}} created",
    });
    expect(template.name).toBe("Ticket Created WhatsApp");

    const updateTemplate = validateUpdateNotificationTemplateDto({
      content: "Updated content",
      active: false,
    });
    expect(updateTemplate.active).toBe(false);

    const settings = validateUpdateNotificationSettingsDto({
      settings: [{ channel: "EMAIL", enabled: true, maxRetries: 3 }],
    });
    expect(settings.settings[0].channel).toBe("EMAIL");
  });

  it("should_throw_for_invalid_payloads", () => {
    expect(() => validateNotificationListQuery({ sortOrder: "up" })).toThrow(ValidationError);
    expect(() => validateSendNotificationDto({})).toThrow(ValidationError);
    expect(() => validateUpdateNotificationTemplateDto({})).toThrow(ValidationError);
    expect(() => validateUpdateNotificationSettingsDto({ settings: [] })).toThrow(ValidationError);
  });
});
