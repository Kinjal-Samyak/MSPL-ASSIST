import { test, expect } from '../fixtures/auth.fixture.js';
import { AccessDeniedPage } from '../pages/AccessDeniedPage.js';
import { NavigationPage } from '../pages/NavigationPage.js';
import { accessToken, expectApiStatus } from '../utils/api-assertions.js';
import { coordinatorCredentials, technicianCredentials } from '../utils/config.js';

test.describe('Role-based access control', () => {
  test('administrator sees Coordinator and Technician navigation', async ({ adminPage }) => {
    await new NavigationPage(adminPage).expectVisible(['Coordinator', 'Technician']);
  });

  test('coordinator is denied Technician route and API', async ({ coordinatorPage }) => {
    const navigation = new NavigationPage(coordinatorPage);
    await navigation.expectHidden(['Technician']);
    await navigation.visit('/technician');
    await new AccessDeniedPage(coordinatorPage).expectVisible();
    await expectApiStatus('/api/v1/technician/dashboard', 401);
    await expectApiStatus('/api/v1/technician/dashboard', 403, await accessToken(coordinatorCredentials()));
  });

  test('technician is denied Coordinator and Admin routes and APIs', async ({ technicianPage }) => {
    const navigation = new NavigationPage(technicianPage);
    await navigation.expectHidden(['Coordinator', 'Admin & Settings']);
    await navigation.visit('/coordinator');
    await new AccessDeniedPage(technicianPage).expectVisible();
    await navigation.visit('/settings');
    await new AccessDeniedPage(technicianPage).expectVisible();
    await expectApiStatus('/api/v1/tickets', 403, await accessToken(technicianCredentials()));
  });
});
