import { test, expect } from '../fixtures/auth.fixture.js';
import { measure } from '../utils/timings.js';

test('administrator can open Dashboard, Users, Reports, Coordinator, and Technician workspaces', async ({ adminPage }) => {
  await measure('admin-dashboard', async () => {
    await expect(adminPage.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  });
  for (const [path, expected] of [
    ['/settings', /Admin|Settings/i],
    ['/reports', /Reports/i],
    ['/coordinator', /Today’s Operations/i],
    ['/technician', /Technician Console/i],
  ] as const) {
    await adminPage.goto(path);
    await expect(adminPage.getByText(expected).first()).toBeVisible();
  }
});
