import { expect, type Page } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard$/);
    await expect(this.page.getByRole('main').or(this.page.locator('body'))).toBeVisible();
  }

  async expectTrainingIndicator(): Promise<void> {
    await expect(this.page.getByRole('status', { name: 'Training environment' })).toBeVisible();
  }
}
