import { expect, type Page } from '@playwright/test';

export class NavigationPage {
  constructor(private readonly page: Page) {}

  link(name: string) {
    return this.page.getByRole('link', { name, exact: true });
  }

  async expectVisible(names: string[]): Promise<void> {
    for (const name of names) await expect(this.link(name)).toBeVisible();
  }

  async expectHidden(names: string[]): Promise<void> {
    for (const name of names) await expect(this.link(name)).toHaveCount(0);
  }

  async visit(path: string): Promise<void> {
    await this.page.goto(path);
  }
}
