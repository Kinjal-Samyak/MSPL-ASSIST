import { ConversationService } from "../../services/conversation.service";
import { logger } from "../../utils/logger";
import { buildConversationSession } from "../helpers/session.fixture";
import * as conversationValidator from "../../validators/conversation.validator";

describe("Integration - Session Lifecycle", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should_expire_old_session_and_create_new_session", async () => {
    const expiredSession = buildConversationSession({
      id: "session-old",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newSession = buildConversationSession({ id: "session-new" });

    const repository = {
      findActiveSessionByWhatsAppNumber: jest.fn().mockResolvedValue(expiredSession),
      createSession: jest.fn().mockResolvedValue(newSession),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      updateLastInteraction: jest.fn(),
      findSessionById: jest.fn(),
      updateSession: jest.fn(),
      updateExpiresAt: jest.fn(),
    } as any;
    jest.useFakeTimers().setSystemTime(new Date("2026-07-09T10:00:00.000Z"));
    jest.spyOn(conversationValidator, "validateConversationRequest").mockReturnValue({
      whatsappNumber: "919999111222",
      message: "hello",
    });

    const service = new ConversationService(repository, { getIssueCategories: jest.fn() } as any, {
      process: jest.fn(),
    } as any);

    const result = await service.handleIncomingMessage({
      whatsappNumber: "919999111222",
      message: "hello",
    });

    expect(repository.deleteSession).toHaveBeenCalledWith("session-old");
    expect(repository.createSession).toHaveBeenCalledTimes(1);
    expect(result.isNewSession).toBe(true);
    expect(result.isExpired).toBe(true);
  });

  it("should_reset_existing_session_when_reset_command_is_received", async () => {
    const existingSession = buildConversationSession({ id: "session-1" });
    const newSession = buildConversationSession({ id: "session-2" });
    const repository = {
      findActiveSessionByWhatsAppNumber: jest.fn().mockResolvedValue(existingSession),
      createSession: jest.fn().mockResolvedValue(newSession),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      updateLastInteraction: jest.fn(),
      findSessionById: jest.fn(),
      updateSession: jest.fn(),
      updateExpiresAt: jest.fn(),
    } as any;
    jest.spyOn(conversationValidator, "validateConversationRequest").mockReturnValue({
      whatsappNumber: "919999111222",
      message: "RESET",
    });

    const service = new ConversationService(repository, { getIssueCategories: jest.fn() } as any, {
      process: jest.fn(),
    } as any);

    const result = await service.handleIncomingMessage({
      whatsappNumber: "919999111222",
      message: "RESET",
    });

    expect(repository.deleteSession).toHaveBeenCalledWith("session-1");
    expect(result.requiresReset).toBe(true);
    expect(result.isNewSession).toBe(true);
  });
});
