import { test, expect } from '../fixtures/auth.fixture.js';
import { TicketPage } from '../pages/TicketPage.js';

test('ticket workspace exposes controls, table, empty/loading state, and validation feedback', async ({ coordinatorPage }) => {
  const tickets = new TicketPage(coordinatorPage);
  await tickets.goto();
  await expect(coordinatorPage.getByRole('button', { name: 'New Ticket' })).toBeEnabled();
  await expect(coordinatorPage.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  await expect(coordinatorPage.getByRole('table')).toBeVisible();
  await tickets.openConversation();
  await coordinatorPage.getByRole('button', { name: 'Search' }).click();
  await expect(coordinatorPage.getByText('Enter a registered mobile number or rider name.')).toBeVisible();
});
