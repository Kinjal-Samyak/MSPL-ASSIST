import { IssueCategoryHandler } from "../../conversations/handlers/issue-category.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("IssueCategoryHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_add_issue_and_move_to_add_more_issues_state", async () => {
    const handler = new IssueCategoryHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_ISSUE_CATEGORY,
      message: "1",
      data: { selectedIssues: [] },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_ADD_MORE_ISSUES);
    expect(result.updatedConversationData.selectedIssues).toHaveLength(1);
  });

  it("should_stay_in_same_state_on_duplicate_issue_selection", async () => {
    const handler = new IssueCategoryHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_ISSUE_CATEGORY,
      message: "battery",
      data: { selectedIssues: [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }] },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_ISSUE_CATEGORY);
    expect(result.replyMessage).toContain("already selected");
  });
});
