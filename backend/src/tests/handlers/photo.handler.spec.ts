import { PhotoHandler } from "../../conversations/handlers/photo.handler";
import { ConversationState } from "../../conversations/conversation.state";
import { buildConversationContext } from "../helpers/conversation-context.builder";
import { logger } from "../../utils/logger";

describe("PhotoHandler", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  it("should_transition_to_photo_upload_when_user_selects_yes", async () => {
    const handler = new PhotoHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_PHOTO,
      message: "yes",
      data: { selectedIssues: [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }] },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_PHOTO_UPLOAD);
    expect(result.updatedConversationData.selectedIssues?.[0].photoUrls).toEqual([]);
  });

  it("should_transition_to_registered_mobile_when_user_skips_last_issue", async () => {
    const handler = new PhotoHandler();
    const context = buildConversationContext({
      state: ConversationState.WAITING_PHOTO,
      message: "2",
      data: { selectedIssues: [{ issueCategoryId: "issue-1", issueCategoryName: "Battery" }] },
    });

    const result = await handler.handle(context);

    expect(result.nextState).toBe(ConversationState.WAITING_REGISTERED_MOBILE);
  });
});
