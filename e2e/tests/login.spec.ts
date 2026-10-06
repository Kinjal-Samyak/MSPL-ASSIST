import { test, expect } from '../fixtures/auth.fixture.js';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { adminCredentials, coordinatorCredentials, technicianCredentials } from '../utils/config.js';
import { measure } from '../utils/timings.js';

test.describe('Authentication', () => {
  const roles = [
    ['Administrator', adminCredentials],
    ['Coordinator', coordinatorCredentials],
    ['Technician', technicianCredentials],
  ] as const;

  for (const [role, getCredentials] of roles) {
    test(`${role} can sign in through the browser`, async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await measure(`login:${role.toLowerCase()}`, () => login.loginAndWaitForDashboard(getCredentials()));
      await new DashboardPage(page).expectLoaded();
    });
  }

  test('invalid credentials show an error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login({ email: 'invalid@msplassist.local', password: 'invalid-password' });
    await login.expectInvalidCredentials();
  });

  test('workspace selection persists and training guidance is visible before sign in', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(page.getByRole('radio', { name: /Live Workspace/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Training Workspace/ })).toBeVisible();
    await login.selectWorkspace('Training Workspace');
    await expect(page.getByRole('status', { name: 'Training environment' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: /Training Workspace/ })).toBeChecked();
  });

  test('Training remains selectable and blocks sign in while its backend is offline', async ({ page }) => {
    await page.route('**/health', (route) => route.fulfill({ status: 503 }));
    const login = new LoginPage(page);
    await login.goto();
    await login.selectWorkspace('Training Workspace');

    await expect(page.getByRole('radio', { name: /Training Workspace/ })).toBeChecked();
    await expect(page.getByText('Training service is offline. Start the dedicated Training backend and try again.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  test('training workspace uses the configured training backend for sign in', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.selectWorkspace('Training Workspace');
    const requestPromise = page.waitForRequest((request) =>
      request.method() === 'POST' && request.url() === `${process.env.E2E_API_URL}/api/v1/auth/login`
    );
    await login.loginAndWaitForDashboard(coordinatorCredentials());
    await requestPromise;
    await expect(page.getByRole('status', { name: 'Training environment' })).toBeVisible();
  });

  test('session persists after reload and logout removes it', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForDashboard(coordinatorCredentials());
    await page.reload();
    await new DashboardPage(page).expectLoaded();
    await login.logout();
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/login$/);
  });
});
