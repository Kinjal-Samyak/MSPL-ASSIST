import { expect, type Page } from '@playwright/test';

export class TicketPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/tickets');
    await expect(this.page.getByRole('heading', { name: 'Ticket Workspace' })).toBeVisible();
  }

  async search(value: string): Promise<void> {
    await this.page.getByPlaceholder('Search ticket, rider, vehicle...').fill(value);
  }

  async openConversation(): Promise<void> {
    await this.page.getByRole('button', { name: 'New Ticket' }).click();
    await expect(this.page.getByRole('heading', { name: 'Find the rider' })).toBeVisible();
  }

  async expectTicketVisible(ticketNumber: string): Promise<void> {
    await expect(this.page.getByText(ticketNumber, { exact: true })).toBeVisible();
  }
}
