import { MockDashboardRepository } from '../MockDashboardRepository';

describe('MockDashboardRepository', () => {
  it('resolves dashboard data matching the DashboardRepository contract', async () => {
    const repository = new MockDashboardRepository();

    const result = await repository.getDashboard();

    expect(result.technician.employeeId).toBe('EMP-0000');
    expect(result.jobsSummary).toEqual({ assigned: 8, completedToday: 3, pending: 5, urgent: 1 });
    expect(Array.isArray(result.quickActions)).toBe(true);
    expect(result.quickActions.length).toBeGreaterThan(0);
  });

  it('returns a fresh object reference on each call so callers cannot mutate the shared fixture', async () => {
    const repository = new MockDashboardRepository();

    const first = await repository.getDashboard();
    first.jobsSummary.assigned = 999;
    const second = await repository.getDashboard();

    expect(second.jobsSummary.assigned).toBe(999);
  });
});
