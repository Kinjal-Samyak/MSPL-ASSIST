import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsMenu } from './NotificationsMenu';
import { useAuthStore } from '@/store';
import { technicianConsoleService } from '@/features/technician/services/technicianConsoleService';
import type * as technicianConsoleServiceModule from '@/features/technician/services/technicianConsoleService';
import type { User } from '@/types';

vi.mock('@/features/technician/services/technicianConsoleService', async () => {
  const actual = await vi.importActual<typeof technicianConsoleServiceModule>(
    '@/features/technician/services/technicianConsoleService'
  );
  return {
    ...actual,
    technicianConsoleService: { ...actual.technicianConsoleService, dashboard: vi.fn() },
  };
});

describe('NotificationsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const technicianUser: User = {
      id: 'tech-1',
      name: 'Test Technician',
      email: 'tech-1@msplassist.test',
      role: 'TECHNICIAN',
    };
    useAuthStore.setState({
      user: technicianUser,
    });
  });

  it('shows an assigned-jobs alert for a Technician, sourced from the technician console dashboard', async () => {
    vi.mocked(technicianConsoleService.dashboard).mockResolvedValue({
      assignedJobs: 3,
      jobsInProgress: 1,
      waitingForParts: 0,
      completedToday: 0,
      averageRepairTimeHours: 0,
      slaCompliancePercent: 100,
      overdueJobs: 0,
      jobCardStageCounts: { IN_PROGRESS: 1, WAITING_PARTS: 0, RFD: 0 },
    });

    render(
      <MemoryRouter>
        <NotificationsMenu />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Notifications, 3 pending')).toBeInTheDocument()
    );
  });
});
