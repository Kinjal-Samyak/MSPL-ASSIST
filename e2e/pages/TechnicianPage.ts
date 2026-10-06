import { expect, type Page } from '@playwright/test';

export class TechnicianPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/technician');
    await expect(this.page.getByRole('heading', { name: 'Technician Console' })).toBeVisible();
  }

  async searchByMvTrackNumber(value: string): Promise<void> {
    await this.page.getByLabel('Search jobs by MV Track Number, ticket number, rider or registration').fill(value);
    await this.page.getByRole('button', { name: 'Search' }).click();
  }
}
