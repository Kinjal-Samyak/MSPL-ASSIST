import { test, expect } from '../fixtures/auth.fixture.js';
import { CoordinatorPage } from '../pages/CoordinatorPage.js';
import { measure } from '../utils/timings.js';

test.describe('Coordinator workspace', () => {
  test('dashboard and ticket workbench load', async ({ coordinatorPage }) => {
    const coordinator = new CoordinatorPage(coordinatorPage);
    await measure('coordinator-dashboard', () => coordinator.gotoDashboard());
    await coordinator.gotoWorkbench();
    await expect(coordinatorPage.getByText('Ticket', { exact: true }).first()).toBeVisible();
  });
});
