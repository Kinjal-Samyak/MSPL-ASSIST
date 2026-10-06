import { ApplicationError } from "../../errors";
import { ConfirmationMessageBuilder } from "../../conversations/helpers/confirmation-message.builder";
import { logger } from "../../utils/logger";

describe("ConfirmationMessageBuilder", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_extract_view_model_and_build_message", () => {
    const viewModel = ConfirmationMessageBuilder.extractViewModel({
      ticket: {
        ticketId: "ticket-1",
        ticketNumber: "MV-090726-001",
        status: "Open",
        createdAt: "2026-07-09T10:00:00.000Z",
      },
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
      selectedIssues: [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }],
    });

    const message = ConfirmationMessageBuilder.buildMessage(viewModel);
    expect(message).toContain("MV-090726-001");
    expect(message).toContain("WB12AB1234");
  });

  it("should_throw_application_error_when_ticket_context_is_missing", () => {
    expect(() => ConfirmationMessageBuilder.extractViewModel({})).toThrow(ApplicationError);
  });
});
