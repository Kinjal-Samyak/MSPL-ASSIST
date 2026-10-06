import { DeploymentVerificationHandler } from "../../conversations/handlers/deployment-verification.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("Integration - Deployment Verification", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_stay_in_verifying_deployment_when_no_active_deployment_found", async () => {
    const deploymentService = {
      getActiveDeployment: jest.fn().mockResolvedValue(null),
    } as any;
    const handler = new DeploymentVerificationHandler(deploymentService);

    const context = buildConversationContext({
      state: ConversationState.VERIFYING_DEPLOYMENT,
      data: {
        registeredCustomer: {
          mobile: "9876543210",
          customerId: "cust-1",
          customerName: "Rider One",
          verified: true,
        },
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.VERIFYING_DEPLOYMENT);
    expect(result.replyMessage).toContain("could not find an active rented vehicle");
    expect(deploymentService.getActiveDeployment).toHaveBeenCalledWith("cust-1");
  });
});
