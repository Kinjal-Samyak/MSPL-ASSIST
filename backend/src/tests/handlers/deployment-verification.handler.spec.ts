import { ApplicationError } from "../../errors";
import { DeploymentVerificationHandler } from "../../conversations/handlers/deployment-verification.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("DeploymentVerificationHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_update_context_and_transition_to_review_ticket_when_deployment_is_found", async () => {
    const deploymentService = {
      getActiveDeployment: jest.fn().mockResolvedValue({
        deploymentId: "dep-1",
        vehicleId: "veh-1",
        vehicleNumber: "WB12AB1234",
        vehicleModel: "M7",
        hubId: "hub-1",
        hubName: "Kolkata Hub",
        rentalStatus: "ACTIVE",
      }),
    } as any;
    const handler = new DeploymentVerificationHandler(deploymentService);
    const context = buildConversationContext({
      state: ConversationState.VERIFYING_DEPLOYMENT,
      data: {
        registeredCustomer: { mobile: "9876543210", customerId: "cust-1", verified: true },
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.REVIEW_TICKET);
    expect(result.updatedConversationData.activeDeployment?.deploymentId).toBe("dep-1");
  });

  it("should_throw_application_error_when_customer_id_is_missing", async () => {
    const handler = new DeploymentVerificationHandler({ getActiveDeployment: jest.fn() } as any);
    const context = buildConversationContext({
      state: ConversationState.VERIFYING_DEPLOYMENT,
      data: { registeredCustomer: { mobile: "9876543210", verified: true } },
    });

    await expect(handler.handle(context)).rejects.toThrow(ApplicationError);
  });
});
