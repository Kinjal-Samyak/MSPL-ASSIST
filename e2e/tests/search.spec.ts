import { test, expect } from '../fixtures/auth.fixture.js';
import { TicketPage } from '../pages/TicketPage.js';
import { measure } from '../utils/timings.js';

test('ticket search accepts a Training MV Track Number', async ({ coordinatorPage }) => {
  const tickets = new TicketPage(coordinatorPage);
  await tickets.goto();
  await measure('ticket-search', () => tickets.search('MVTEST001'));
  await expect(coordinatorPage.getByRole('heading', { name: 'Ticket Workspace' })).toBeVisible();
});
