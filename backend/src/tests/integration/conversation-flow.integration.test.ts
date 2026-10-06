import { AddMoreIssuesHandler } from "../../conversations/handlers/add-more-issues.handler";
import { ConfirmationHandler } from "../../conversations/handlers/confirmation.handler";
import { CustomerVerificationHandler } from "../../conversations/handlers/customer-verification.handler";
import { DeploymentVerificationHandler } from "../../conversations/handlers/deployment-verification.handler";
import { IssueCategoryHandler } from "../../conversations/handlers/issue-category.handler";
import { IssueDescriptionHandler } from "../../conversations/handlers/issue-description.handler";
import { MainMenuHandler } from "../../conversations/handlers/main-menu.handler";
import { PhotoHandler } from "../../conversations/handlers/photo.handler";
import { RegisteredMobileHandler } from "../../conversations/handlers/registered-mobile.handler";
import { TicketCreationHandler } from "../../conversations/handlers/ticket-creation.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { applyConversationResult } from "../helpers/integration-workflow.helper";
import { defaultIssueCategories } from "../helpers/test-data.builders";
import { logger } from "../../utils/logger";

describe("Integration - Conversation Flow", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_complete_happy_path_from_main_menu_to_confirmation", async () => {
    const customerService = {
      findByRegisteredMobile: jest.fn().mockResolvedValue({ id: "cust-1", name: "Rider One" }),
    } as any;
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
    const ticketService = {
      createTicket: jest.fn().mockResolvedValue({
        existingTicket: false,
        ticketId: "ticket-1",
        ticketNumber: "MV-090726-001",
        createdAt: "2026-07-09T10:00:00.000Z",
      }),
    } as any;

    const mainMenuHandler = new MainMenuHandler();
    const issueCategoryHandler = new IssueCategoryHandler();
    const addMoreIssuesHandler = new AddMoreIssuesHandler();
    const issueDescriptionHandler = new IssueDescriptionHandler();
    const photoHandler = new PhotoHandler();
    const registeredMobileHandler = new RegisteredMobileHandler();
    const customerVerificationHandler = new CustomerVerificationHandler(customerService);
    const deploymentVerificationHandler = new DeploymentVerificationHandler(deploymentService);
    const ticketCreationHandler = new TicketCreationHandler(ticketService);
    const confirmationHandler = new ConfirmationHandler();

    let context = buildConversationContext({
      state: ConversationState.MAIN_MENU,
      message: "1",
      issueCategories: defaultIssueCategories,
      data: {},
    });

    const menuResult = await mainMenuHandler.handle(context);
    expect(menuResult.nextState).toBe(ConversationState.WAITING_ISSUE_CATEGORY);

    context = applyConversationResult(context, menuResult, "1");
    const issueResult = await issueCategoryHandler.handle(context);
    expect(issueResult.nextState).toBe(ConversationState.WAITING_ADD_MORE_ISSUES);

    context = applyConversationResult(context, issueResult, "2");
    const addMoreResult = await addMoreIssuesHandler.handle(context);
    expect(addMoreResult.nextState).toBe(ConversationState.WAITING_ISSUE_DESCRIPTION);

    context = applyConversationResult(context, addMoreResult, "Battery drains quickly during ride");
    const descriptionResult = await issueDescriptionHandler.handle(context);
    expect(descriptionResult.nextState).toBe(ConversationState.WAITING_PHOTO);

    context = applyConversationResult(context, descriptionResult, "2");
    const photoResult = await photoHandler.handle(context);
    expect(photoResult.nextState).toBe(ConversationState.WAITING_REGISTERED_MOBILE);

    context = applyConversationResult(context, photoResult, "+91 98765 43210");
    const mobileResult = await registeredMobileHandler.handle(context);
    expect(mobileResult.nextState).toBe(ConversationState.VERIFYING_CUSTOMER);

    context = applyConversationResult(context, mobileResult, "continue");
    const verifyCustomerResult = await customerVerificationHandler.handle(context);
    expect(verifyCustomerResult.nextState).toBe(ConversationState.VERIFYING_DEPLOYMENT);

    context = applyConversationResult(context, verifyCustomerResult, "continue");
    const verifyDeploymentResult = await deploymentVerificationHandler.handle(context);
    expect(verifyDeploymentResult.nextState).toBe(ConversationState.REVIEW_TICKET);

    context = applyConversationResult(context, verifyDeploymentResult, "confirm");
    context.currentState = ConversationState.WAITING_TICKET_CREATION;
    const ticketResult = await ticketCreationHandler.handle(context);
    expect(ticketResult.nextState).toBe(ConversationState.CONFIRMATION);
    expect(ticketResult.updatedConversationData.ticket?.ticketNumber).toBe("MV-090726-001");

    context = applyConversationResult(context, ticketResult, "ok");
    const confirmationResult = await confirmationHandler.handle(context);
    expect(confirmationResult.nextState).toBe(ConversationState.COMPLETED);
    expect(confirmationResult.isConversationComplete).toBe(true);
    expect(confirmationResult.replyMessage).toContain("MV-090726-001");

    expect(ticketService.createTicket).toHaveBeenCalledTimes(1);
  });

  it("should_support_multiple_issues_and_keep_primary_issue_mapping_consistent", async () => {
    const issueCategoryHandler = new IssueCategoryHandler();
    const addMoreIssuesHandler = new AddMoreIssuesHandler();
    const issueDescriptionHandler = new IssueDescriptionHandler();
    const photoHandler = new PhotoHandler();

    let context = buildConversationContext({
      state: ConversationState.WAITING_ISSUE_CATEGORY,
      message: "1",
      issueCategories: defaultIssueCategories,
      data: { selectedIssues: [] },
    });

    const firstIssueResult = await issueCategoryHandler.handle(context);
    context = applyConversationResult(context, firstIssueResult, "1");
    const addMoreFirst = await addMoreIssuesHandler.handle(context);

    context = applyConversationResult(context, addMoreFirst, "2");
    const secondIssueResult = await issueCategoryHandler.handle(context);

    context = applyConversationResult(context, secondIssueResult, "1");
    const addMoreSecond = await addMoreIssuesHandler.handle(context);

    context = applyConversationResult(context, addMoreSecond, "3");
    const thirdIssueResult = await issueCategoryHandler.handle(context);

    context = applyConversationResult(context, thirdIssueResult, "2");
    const doneAdding = await addMoreIssuesHandler.handle(context);
    expect(doneAdding.nextState).toBe(ConversationState.WAITING_ISSUE_DESCRIPTION);

    context = applyConversationResult(context, doneAdding, "Battery issue detailed description");
    const d1 = await issueDescriptionHandler.handle(context);
    context = applyConversationResult(context, d1, "Brake issue detailed description");
    const d2 = await issueDescriptionHandler.handle(context);
    context = applyConversationResult(context, d2, "Motor issue detailed description");
    const d3 = await issueDescriptionHandler.handle(context);

    expect(d3.nextState).toBe(ConversationState.WAITING_PHOTO);
    expect(d3.updatedConversationData.selectedIssues).toHaveLength(3);
    expect(d3.updatedConversationData.selectedIssues?.[0].issueCategoryName).toBe("Battery");

    context = applyConversationResult(context, d3, "2");
    const p1 = await photoHandler.handle(context);
    context = applyConversationResult(context, p1, "2");
    const p2 = await photoHandler.handle(context);
    context = applyConversationResult(context, p2, "2");
    const p3 = await photoHandler.handle(context);

    expect(p3.nextState).toBe(ConversationState.WAITING_REGISTERED_MOBILE);
    expect(p3.updatedConversationData.selectedIssues?.every((i) => Array.isArray(i.photoUrls))).toBe(true);
  });
});
