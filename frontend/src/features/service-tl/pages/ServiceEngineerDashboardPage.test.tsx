import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceEngineerDashboardPage } from './ServiceEngineerDashboardPage';
import { ticketService } from '@/services/ticketService';
import type * as ticketServiceModule from '@/services/ticketService';

vi.mock('@/services/ticketService', async () => {
  const actual = await vi.importActual<typeof ticketServiceModule>('@/services/ticketService');
  return {
    ...actual,
    ticketService: { ...actual.ticketService, getServiceEngineerDashboard: vi.fn() },
  };
});

describe('ServiceEngineerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders every KPI tile from the dashboard response', async () => {
    vi.mocked(ticketService.getServiceEngineerDashboard).mockResolvedValue({
      jobsByStatus: { created: 2, review: 3, workshopRequired: 4, rfd: 1 },
      jobsAwaitingAssignment: 5,
      jobsAwaitingPartsApproval: 6,
      jobsAwaitingGoodsIssue: 6,
      jobsAwaitingReturnsVerification: 2,
      jobsReadyForReview: 3,
      jobsReadyForDelivery: 1,
      overdueJobs: 7,
      technicianAvailability: { available: 3, busy: 2, total: 5 },
      workshopUtilizationPercent: 40,
      inventoryAlerts: 9,
      recentActivity: [
        {
          id: 'act-1',
          ticketId: 'ticket-1',
          ticketNumber: 'MV-001',
          activityType: 'SPARE_PART_REQUEST_APPROVED',
          description: 'Approved 2 x BRK001.',
          performedByName: 'Priya',
          performedAt: '2026-07-29T10:00:00.000Z',
        },
      ],
    });

    render(<ServiceEngineerDashboardPage />);

    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument()); // Awaiting Assignment
    // Awaiting Parts Approval and Awaiting Goods Issue read the same underlying count (6) - both tiles render it.
    expect(screen.getAllByText('6')).toHaveLength(2);
    expect(screen.getByText('7')).toBeInTheDocument(); // Overdue Jobs
    expect(screen.getByText('9')).toBeInTheDocument(); // Inventory Alerts
    expect(screen.getByText('3 / 5')).toBeInTheDocument(); // Technician Availability
    expect(screen.getByText('40%')).toBeInTheDocument(); // Workshop Utilisation
    expect(screen.getByText(/Spare Part Request Approved — MV-001/)).toBeInTheDocument();
  });

  it('shows an error banner when the dashboard fails to load', async () => {
    vi.mocked(ticketService.getServiceEngineerDashboard).mockRejectedValue(
      new Error('Network error')
    );

    render(<ServiceEngineerDashboardPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
