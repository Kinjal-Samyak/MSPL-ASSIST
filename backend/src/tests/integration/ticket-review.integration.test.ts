import { ConversationTicketMapper } from "../../conversations/mappers/conversation-ticket.mapper";
import { ConversationState } from "../../conversations/conversation.state";
import { ConversationService } from "../../services/conversation.service";
import { buildConversationSession } from "../helpers/session.fixture";
import {
  TestConversationBuilder,
  TestCustomerBuilder,
  TestDeploymentBuilder,
  TestIssueBuilder,
} from "../helpers/test-data.builders";
import { logger } from "../../utils/logger";

describe("Integration - Ticket Review Handoff", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_map_reviewed_context_to_ticket_dto_before_ticket_creation", () => {
    const contextData = new TestConversationBuilder()
      .withCustomer(new TestCustomerBuilder().build())
      .withDeployment(new TestDeploymentBuilder().build())
      .withIssues([
        new TestIssueBuilder()
          .withCategory("issue-1", "Battery")
          .withDescription("Battery drains quickly after full charge")
          .withPhotos(["PHOTO_001"])
          .build(),
        new TestIssueBuilder()
          .withCategory("issue-2", "Brake")
          .withDescription("Brake noise from rear wheel")
          .withPhotos(["PHOTO_002"])
          .build(),
      ])
      .build();

    const dto = ConversationTicketMapper.mapToCreateTicketDto(contextData);

    expect(dto.issueCategoryId).toBe("issue-1");
    expect(dto.issueDescription).toContain("Battery drains quickly");
    expect(dto.mvTrackNumber).toBe("dep-1");
    expect(dto.coordinatorNotes).toContain("PHOTO_001");
    expect(dto.coordinatorNotes).toContain("PHOTO_002");
  });

  it("should_persist_state_transition_from_review_to_waiting_ticket_creation", async () => {
    const updatedSession = buildConversationSession({
      currentState: ConversationState.WAITING_TICKET_CREATION,
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

    const result = await service.updateSessionState(
      "session-1",
      ConversationState.WAITING_TICKET_CREATION,
      {}
    );

    expect(result.currentState).toBe(ConversationState.WAITING_TICKET_CREATION);
    expect(repository.updateSession).toHaveBeenCalledWith("session-1", {
      currentState: ConversationState.WAITING_TICKET_CREATION,
      conversationData: {},
    });
  });
});
