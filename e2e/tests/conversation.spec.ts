import { test, expect } from '../fixtures/auth.fixture.js';
import { ConversationPage } from '../pages/ConversationPage.js';
import { TicketPage } from '../pages/TicketPage.js';
import { measure } from '../utils/timings.js';

test.describe.serial('Conversation ticket workflow', () => {
  test('coordinator creates and retrieves a conversation ticket', async ({ coordinatorPage }) => {
    const tickets = new TicketPage(coordinatorPage);
    const conversation = new ConversationPage(coordinatorPage);
    await tickets.goto();
    await tickets.openConversation();
    await conversation.findRider('9000000001');
    await conversation.confirmVehicle();
    await conversation.setRideability();
    await conversation.selectIssueGroups();
    await conversation.continueToReview('Playwright Training validation request.');
    const ticketNumber = await measure('conversation-submission', () => conversation.submit());
    expect(ticketNumber).not.toEqual('');
    await tickets.goto();
    await measure('conversation-retrieval', () => tickets.search(ticketNumber));
    await tickets.expectTicketVisible(ticketNumber);
  });
});
