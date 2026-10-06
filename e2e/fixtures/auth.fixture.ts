import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { adminCredentials, coordinatorCredentials, technicianCredentials } from '../utils/config.js';

type AuthenticatedPages = { adminPage: Page; coordinatorPage: Page; technicianPage: Page };

async function loggedInPage(page: Page, credentials: ReturnType<typeof adminCredentials>): Promise<Page> {
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWaitForDashboard(credentials);
  return page;
}

export const test = base.extend<AuthenticatedPages>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(await loggedInPage(await context.newPage(), adminCredentials()));
    await context.close();
  },
  coordinatorPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(await loggedInPage(await context.newPage(), coordinatorCredentials()));
    await context.close();
  },
  technicianPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(await loggedInPage(await context.newPage(), technicianCredentials()));
    await context.close();
  },
});

export { expect } from '@playwright/test';
