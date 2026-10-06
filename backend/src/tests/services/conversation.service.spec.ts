import { ConversationState } from "../../conversations/conversation.state";
import { ConversationService } from "../../services/conversation.service";
import { logger } from "../../utils/logger";
import { buildConversationSession } from "../helpers/session.fixture";
import * as conversationValidator from "../../validators/conversation.validator";

describe("ConversationService", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_create_new_session_on_start_command", async () => {
    const repository = {
      findActiveSessionByWhatsAppNumber: jest.fn().mockResolvedValue(null),
      createSession: jest.fn().mockResolvedValue(buildConversationSession()),
      deleteSession: jest.fn(),
      updateLastInteraction: jest.fn(),
      findSessionById: jest.fn(),
      updateSession: jest.fn(),
      updateExpiresAt: jest.fn(),
    } as any;
    const masterService = { getIssueCategories: jest.fn() } as any;
    const engine = { process: jest.fn() } as any;
    jest
      .spyOn(conversationValidator, "validateConversationRequest")
      .mockReturnValue({ whatsappNumber: "919999111222", message: "START" });

    const service = new ConversationService(repository, masterService, engine);
    const result = await service.handleIncomingMessage({
      whatsappNumber: "919999111222",
      message: "START",
    });

    expect(result.isNewSession).toBe(true);
    expect(result.requiresReset).toBe(false);
    expect(repository.createSession).toHaveBeenCalled();
  });

  it("should_resume_existing_session_when_no_command_received", async () => {
    const existingSession = buildConversationSession({ currentState: ConversationState.WAITING_PHOTO });
    const repository = {
      findActiveSessionByWhatsAppNumber: jest.fn().mockResolvedValue(existingSession),
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      updateLastInteraction: jest.fn().mockResolvedValue(existingSession),
      findSessionById: jest.fn(),
      updateSession: jest.fn(),
      updateExpiresAt: jest.fn(),
    } as any;
    const masterService = { getIssueCategories: jest.fn() } as any;
    const engine = { process: jest.fn() } as any;
    jest
      .spyOn(conversationValidator, "validateConversationRequest")
      .mockReturnValue({ whatsappNumber: "919999111222", message: "continue" });

    const service = new ConversationService(repository, masterService, engine);
    const result = await service.handleIncomingMessage({
      whatsappNumber: "919999111222",
      message: "continue",
    });

    expect(result.isNewSession).toBe(false);
    expect(repository.updateLastInteraction).toHaveBeenCalledWith(existingSession.id);
  });

  it("should_process_conversation_message_and_persist_state_transition", async () => {
    const session = buildConversationSession({
      currentState: ConversationState.MAIN_MENU,
      conversationData: {},
    });
    const updatedSession = buildConversationSession({
      currentState: ConversationState.WAITING_ISSUE_CATEGORY,
      conversationData: { selectedIssues: [] },
    });
    const repository = {
      findSessionById: jest.fn().mockResolvedValue(session),
      updateSession: jest.fn().mockResolvedValue(updatedSession),
      updateExpiresAt: jest.fn().mockResolvedValue(updatedSession),
      findActiveSessionByWhatsAppNumber: jest.fn(),
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      updateLastInteraction: jest.fn(),
    } as any;
    const masterService = {
      getIssueCategories: jest.fn().mockResolvedValue([{ id: "issue-1", name: "Battery" }]),
    } as any;
    const engine = {
      process: jest.fn().mockResolvedValue({
        replyMessage: "Select issue",
        nextState: ConversationState.WAITING_ISSUE_CATEGORY,
        updatedConversationData: { selectedIssues: [] },
        isConversationComplete: false,
      }),
    } as any;

    const service = new ConversationService(repository, masterService, engine);
    const result = await service.processConversationMessage("session-1", "hello");

    expect(result.replyMessage).toBe("Select issue");
    expect(repository.updateSession).toHaveBeenCalled();
    expect(repository.updateExpiresAt).toHaveBeenCalled();
  });

  it("should_update_session_state_and_return_mapped_dto", async () => {
    const updatedSession = buildConversationSession({
      currentState: ConversationState.WAITING_PHOTO,
      conversationData: { selectedIssues: [] },
    });
    const repository = {
      updateSession: jest.fn().mockResolvedValue(updatedSession),
      updateExpiresAt: jest.fn().mockResolvedValue(updatedSession),
      findActiveSessionByWhatsAppNumber: jest.fn(),
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      updateLastInteraction: jest.fn(),
      findSessionById: jest.fn(),
    } as any;

    const service = new ConversationService(repository, { getIssueCategories: jest.fn() } as any, {
      process: jest.fn(),
    } as any);

    const result = await service.updateSessionState("session-1", ConversationState.WAITING_PHOTO, {});

    expect(repository.updateSession).toHaveBeenCalledWith("session-1", {
      currentState: ConversationState.WAITING_PHOTO,
      conversationData: {},
    });
    expect(result.currentState).toBe(ConversationState.WAITING_PHOTO);
  });

  it("should_update_context_link_customer_link_ticket_and_end_session", async () => {
    const updatedSession = buildConversationSession();
    const repository = {
      updateSession: jest.fn().mockResolvedValue(updatedSession),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      updateExpiresAt: jest.fn(),
      findActiveSessionByWhatsAppNumber: jest.fn(),
      createSession: jest.fn(),
      updateLastInteraction: jest.fn(),
      findSessionById: jest.fn(),
    } as any;
    const service = new ConversationService(repository, { getIssueCategories: jest.fn() } as any, {
      process: jest.fn(),
    } as any);

    await service.updateSessionContext("session-1", { metadata: { step: "test" } });
    await service.linkCustomerToSession("session-1", "cust-1");
    await service.linkTicketToSession("session-1", "ticket-1");
    await service.endSession("session-1");

    expect(repository.updateSession).toHaveBeenCalledTimes(3);
    expect(repository.deleteSession).toHaveBeenCalledWith("session-1");
  });
});
