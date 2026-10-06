import { expect, type Page } from '@playwright/test';

export class ConversationPage {
  constructor(private readonly page: Page) {}

  async findRider(mobile: string): Promise<void> {
    await this.page.getByLabel('Registered Mobile Number or Rider Name').fill(mobile);
    await this.page.getByRole('button', { name: 'Search' }).click();
    await expect(this.page.getByRole('button', { name: /Developer Test Rider|Rahul Das/ }).first()).toBeVisible();
    await this.page.getByRole('button', { name: /Developer Test Rider|Rahul Das/ }).first().click();
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  async confirmVehicle(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Is this your vehicle?' })).toBeVisible();
    await this.page.getByRole('button', { name: /MV Track Number:/ }).first().click();
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  async setRideability(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Can you ride the vehicle?' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Yes, I can ride it.' }).click();
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  async selectIssueGroups(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'What is the problem?' })).toBeVisible();
    const categoryStep = this.page.getByRole('heading', { name: 'What is the problem?' }).locator('..');
    await categoryStep.getByRole('button').first().click();
    await this.page.getByRole('button', { name: 'Next' }).click();
    await expect(this.page.getByRole('heading', { name: 'Tell us more about the problem' })).toBeVisible();
    const subcategoryStep = this.page.getByRole('heading', { name: 'Tell us more about the problem' }).locator('..');
    await subcategoryStep.getByRole('button').first().click();
    await this.page.getByRole('button', { name: 'Next' }).click();
    await expect(this.page.getByRole('heading', { name: 'Is there another issue?' })).toBeVisible();
  }

  async continueToReview(remarks: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Another' }).click();
    await expect(this.page.getByRole('heading', { name: 'What is the problem?' })).toBeVisible();
    const secondCategoryStep = this.page.getByRole('heading', { name: 'What is the problem?' }).locator('..');
    await secondCategoryStep.getByRole('button').nth(1).click();
    await this.page.getByRole('button', { name: 'Next' }).click();
    const secondSubcategoryStep = this.page.getByRole('heading', { name: 'Tell us more about the problem' }).locator('..');
    await secondSubcategoryStep.getByRole('button').first().click();
    await this.page.getByRole('button', { name: 'Next' }).click();
    await expect(this.page.getByRole('heading', { name: 'Is there another issue?' })).toBeVisible();
    await this.page.getByRole('button', { name: 'No, Continue' }).click();
    await expect(this.page.getByRole('heading', { name: 'Anything else you want to tell us?' })).toBeVisible();
    await this.page.getByPlaceholder('Tell us anything else that might help our service team.').fill(remarks);
    await this.page.getByRole('button', { name: 'Next' }).click();
    await expect(this.page.getByRole('heading', { name: 'Would you like to upload a photo?' })).toBeVisible();
    await this.page.getByLabel('Upload service-request photos').setInputFiles({
      name: 'training-e2e-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9MwAAAABJRU5ErkJggg==', 'base64'),
    });
    await expect(this.page.getByText('training-e2e-photo.png', { exact: true })).toBeVisible();
    await this.page.getByRole('button', { name: 'Next' }).click();
    await expect(this.page.getByRole('heading', { name: 'Please check your details' })).toBeVisible();
  }

  async submit(): Promise<string> {
    await this.page.getByRole('button', { name: 'Create Ticket' }).click();
    await expect(this.page.getByText('Your service request has been submitted successfully.').or(this.page.getByText('An active service request already exists.'))).toBeVisible();
    return (await this.page.locator('text=Ticket Number').locator('..').locator('p').nth(1).textContent())?.trim() ?? '';
  }
}
