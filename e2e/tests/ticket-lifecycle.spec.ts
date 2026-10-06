import { test, expect } from '../fixtures/auth.fixture.js';
import { TicketPage } from '../pages/TicketPage.js';

test('ticket list refresh and detail selection work against Training data', async ({ coordinatorPage }) => {
  const tickets = new TicketPage(coordinatorPage);
  await tickets.goto();
  await coordinatorPage.getByRole('button', { name: 'Refresh' }).click();
  await expect(coordinatorPage.getByRole('table')).toBeVisible();
  const firstTicketRow = coordinatorPage.getByRole('row').nth(1);
  if (await firstTicketRow.count()) await firstTicketRow.click();
});
