import { expect, type Page } from '@playwright/test';
import type { Credentials } from '../utils/config.js';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  }

  async login(credentials: Credentials): Promise<void> {
    await this.page.getByLabel('Email address').fill(credentials.email);
    await this.page.getByLabel('Password').fill(credentials.password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  async selectWorkspace(workspace: 'Live Workspace' | 'Training Workspace'): Promise<void> {
    await this.page.getByRole('radio', { name: new RegExp(workspace) }).check();
  }

  async loginAndWaitForDashboard(credentials: Credentials): Promise<void> {
    await this.login(credentials);
    await this.page.waitForURL('**/dashboard');
  }

  async expectInvalidCredentials(): Promise<void> {
    await expect(this.page.getByRole('alert')).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.page.locator('header button').last().click();
    await this.page.getByText('Sign out', { exact: true }).click();
    await this.page.waitForURL('**/login');
  }
}
