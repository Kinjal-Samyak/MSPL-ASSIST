import { IssueDescriptionHandler } from "../../conversations/handlers/issue-description.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("IssueDescriptionHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_store_description_and_stay_for_next_issue_when_pending_issues_exist", async () => {
    const handler = new IssueDescriptionHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_ISSUE_DESCRIPTION,
      message: "Battery drains too fast",
      data: {
        selectedIssues: [
          { issueCategoryId: "issue-1", issueCategoryName: "Battery" },
          { issueCategoryId: "issue-2", issueCategoryName: "Brake" },
        ],
      },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_ISSUE_DESCRIPTION);
    expect(result.updatedConversationData.selectedIssues?.[0].description).toBe(
      "Battery drains too fast"
    );
  });

  it("should_return_validation_error_when_description_is_too_short", async () => {
    const handler = new IssueDescriptionHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_ISSUE_DESCRIPTION,
      message: "short",
      data: { selectedIssues: [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }] },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_ISSUE_DESCRIPTION);
    expect(result.replyMessage).toContain("at least 10 characters");
  });
});
