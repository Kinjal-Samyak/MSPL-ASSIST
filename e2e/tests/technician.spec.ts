import { test, expect } from '../fixtures/auth.fixture.js';
import { TechnicianPage } from '../pages/TechnicianPage.js';
import { measure } from '../utils/timings.js';

test.describe('Technician Console', () => {
  test('dashboard loads and supports MV Track Number search', async ({ technicianPage }) => {
    const technician = new TechnicianPage(technicianPage);
    await measure('technician-dashboard', () => technician.goto());
    await technician.searchByMvTrackNumber('MVTEST001');
    await expect(technicianPage.getByRole('heading', { name: 'Technician Console' })).toBeVisible();
  });
});
