import { ApplicationError } from "../../errors";
import { ConversationTicketMapper } from "../../conversations/mappers/conversation-ticket.mapper";
import { logger } from "../../utils/logger";

describe("ConversationTicketMapper", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_map_context_data_to_create_ticket_dto", () => {
    const dto = ConversationTicketMapper.mapToCreateTicketDto({
      registeredCustomer: {
        mobile: "9876543210",
        customerId: "cust-1",
        customerName: "Rider One",
        verified: true,
      },
      activeDeployment: {
        deploymentId: "dep-1",
        vehicleId: "veh-1",
        vehicleNumber: "WB12AB1234",
        vehicleModel: "M7",
        hubId: "hub-1",
        hubName: "Kolkata Hub",
        rentalStatus: "ACTIVE",
      },
      selectedIssues: [
        {
          issueCategoryId: "issue-1",
          issueCategoryName: "Battery",
          description: "Battery drains quickly",
          photoUrls: ["PHOTO_001", "PHOTO_002"],
        },
      ],
    });

    expect(dto).toMatchObject({
      registeredMobile: "9876543210",
      issueCategoryId: "issue-1",
      issueDescription: "Battery drains quickly",
      source: "WHATSAPP",
      priority: "MEDIUM",
      sendUpdate: true,
      mvTrackNumber: "dep-1",
      vehicleNumber: "WB12AB1234",
    });
    expect(dto.coordinatorNotes).toContain("PHOTO_001");
  });

  it("should_throw_application_error_when_required_data_is_missing", () => {
    expect(() => ConversationTicketMapper.mapToCreateTicketDto({})).toThrow(ApplicationError);
  });
});
