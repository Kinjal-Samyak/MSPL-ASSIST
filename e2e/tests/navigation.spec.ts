import { test, expect } from '../fixtures/auth.fixture.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { NavigationPage } from '../pages/NavigationPage.js';

test('administrator navigation links load without a broken route', async ({ adminPage }) => {
  const navigation = new NavigationPage(adminPage);
  await navigation.expectVisible(['Dashboard', 'Tickets', 'Riders', 'Vehicles', 'Deployments', 'Workshop', 'Parts', 'Reports', 'Coordinator', 'Technician']);
  await navigation.link('Tickets').click();
  await expect(adminPage.getByRole('heading', { name: 'Ticket Workspace' })).toBeVisible();
});

test('Training environment is visibly identified in the browser', async ({ adminPage }) => {
  await new DashboardPage(adminPage).expectTrainingIndicator();
});
