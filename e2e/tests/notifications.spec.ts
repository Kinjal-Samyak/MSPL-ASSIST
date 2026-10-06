import { test, expect } from '../fixtures/auth.fixture.js';
import { getAuthenticated } from '../utils/api-assertions.js';
import { adminCredentials } from '../utils/config.js';

test('Training notification delivery is suppressed and auditable', async ({ adminPage }) => {
  await adminPage.goto('/notifications');
  await adminPage.getByPlaceholder('Source Entity Id').fill(`e2e-${Date.now()}`);
  await adminPage.getByPlaceholder('Recipient').fill('9000000001');
  await adminPage.getByPlaceholder('Message (required when no template selected)').fill('Training E2E notification validation.');
  await adminPage.getByRole('button', { name: 'Send Notification', exact: true }).click();
  await expect(adminPage.getByText('Notification send request completed.')).toBeVisible();

  const response = await getAuthenticated('/api/v1/notifications?page=1&pageSize=100', adminCredentials());
  await expect(response).toBeOK();
  const serialized = JSON.stringify(await response.json());
  expect(serialized).toContain('NOT_SENT');
  expect(serialized).toContain('training-suppressed');
});
