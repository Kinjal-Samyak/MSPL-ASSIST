import { expect, type Page } from '@playwright/test';

export class CoordinatorPage {
  constructor(private readonly page: Page) {}

  async gotoDashboard(): Promise<void> {
    await this.page.goto('/coordinator');
    await expect(this.page.getByRole('heading', { name: 'Today’s Operations' })).toBeVisible();
  }

  async gotoWorkbench(): Promise<void> {
    await this.page.goto('/coordinator/tickets');
    await expect(this.page.getByRole('heading', { name: 'Ticket Workbench' })).toBeVisible();
  }
}
