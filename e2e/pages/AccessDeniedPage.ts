import { expect, type Page } from '@playwright/test';

export class AccessDeniedPage {
  constructor(private readonly page: Page) {}

  async expectVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(this.page.getByText('You do not have permission to access this area.')).toBeVisible();
  }
}
