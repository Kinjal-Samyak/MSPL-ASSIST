import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobCardWorkspace } from './JobCardWorkspace';
import { ticketService, type JobCardDetail } from '@/services/ticketService';
import { technicianConsoleService } from '../services/technicianConsoleService';
import { useAuthStore } from '@/store/authStore';
import type * as ticketServiceModule from '@/services/ticketService';

vi.mock('@/services/ticketService', async () => {
  const actual = await vi.importActual<typeof ticketServiceModule>('@/services/ticketService');
  return {
    ...actual,
    ticketService: {
      ...actual.ticketService,
      getJobCardDetail: vi.fn(),
      saveJobCardDetails: vi.fn(),
      downloadJobCardPdf: vi.fn(),
      markWaitingForParts: vi.fn(),
      resumeRepair: vi.fn(),
      startRepair: vi.fn(),
      markJobCardCompleted: vi.fn(),
      listSparePartRequests: vi.fn().mockResolvedValue([]),
      listSparePartReturnRequests: vi.fn().mockResolvedValue([]),
      searchParts: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('../services/technicianConsoleService', () => ({
  technicianConsoleService: {
    timeline: vi.fn().mockResolvedValue([]),
    attachPhotoReference: vi.fn(),
  },
}));

function buildJobCardDetail(overrides: Partial<JobCardDetail> = {}): JobCardDetail {
  return {
    id: 'jc-1',
    jobCardNumber: 'JC-MV-001',
    ticketId: 'ticket-1',
    ticketNumber: 'MV-001',
    workflowStage: 'IN_PROGRESS',
    effectiveStatus: 'IN_PROGRESS',
    effectiveStatusLabel: 'In Progress',
    technicianId: 'tech-1',
    technicianName: 'Ravi',
    createdAt: '2026-07-20T00:00:00.000Z',
    createdBy: 'System',
    initialObservation: null,
    rootCause: null,
    workPerformed: null,
    otherRequirements: null,
    technicianRemarks: null,
    labourCharges: null,
    partsCharges: null,
    otherCharges: null,
    totalCharges: null,
    estimatedCompletionAt: null,
    actualCompletionAt: null,
    completedByName: null,
    closureRemarks: null,
    version: 1,
    lastEditedAt: null,
    partsRequisitionNumber: null,
    partsRequisitionCreatedAt: null,
    partsRequisitionClosedAt: null,
    updatedAt: '2026-07-20T00:00:00.000Z',
    repairStartedAt: '2026-07-20T01:00:00.000Z',
    readyForDeliveryAt: null,
    readyForDeliveryByName: null,
    finalSparePartsAmount: null,
    finalBillingSnapshot: null,
    spareParts: [],
    partsTimeline: [],
    editable: true,
    rider: {
      name: 'Asha',
      mobile: '9999900000',
      mvTrackNumber: 'MV-T-1',
      vehicleModel: 'M7',
      vehicleType: 'High Speed',
      registrationNumber: null,
      hub: 'Kolkata',
    },
    complaint: {
      rideabilityStatus: 'MOVABLE',
      issueCategory: 'Brake',
      issueSubcategory: 'Brake Pad',
      riderRemarks: null,
      riderPhotos: [],
    },
    assignment: {
      serviceTlName: 'Priya',
      serviceTlAssignedAt: '2026-07-19T00:00:00.000Z',
      technicianAssignedAt: '2026-07-20T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('JobCardWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'tech-1', name: 'Ravi', email: 'ravi@example.com', role: 'TECHNICIAN' },
    });
    vi.mocked(technicianConsoleService.timeline).mockResolvedValue([]);
  });

  it('surfaces the backend reconciliation error on Mark Complete and does not advance the job card', async () => {
    const detail = buildJobCardDetail();
    vi.mocked(ticketService.getJobCardDetail).mockResolvedValue(detail);
    vi.mocked(ticketService.markJobCardCompleted).mockRejectedValue(
      new Error(
        'Every issued spare part must be fully consumed or returned before completing this job card: BRK001 (issued 2, consumed 0, returned 0).'
      )
    );
    const user = userEvent.setup();

    render(<JobCardWorkspace ticketId="ticket-1" />);

    await waitFor(() =>
      expect(screen.getByText('JC-MV-001 · Linked Ticket MV-001')).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /Every issued spare part must be fully consumed or returned before completing this job card/
        )
      ).toBeInTheDocument()
    );
    // getJobCardDetail was called once on mount and never again - the failed transition did not
    // trigger a reload, i.e. the job card was not treated as advanced.
    expect(ticketService.getJobCardDetail).toHaveBeenCalledTimes(1);
  });

  it('advances past Mark Complete when the backend accepts the transition', async () => {
    const detail = buildJobCardDetail();
    vi.mocked(ticketService.getJobCardDetail).mockResolvedValue(detail);
    vi.mocked(ticketService.markJobCardCompleted).mockResolvedValue({
      jobCardId: 'jc-1',
      ticketId: 'ticket-1',
      previousStage: 'IN_PROGRESS',
      newStage: 'COMPLETED',
      technicianId: 'tech-1',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    const onWorkflowChange = vi.fn();
    const user = userEvent.setup();

    render(<JobCardWorkspace ticketId="ticket-1" onWorkflowChange={onWorkflowChange} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() =>
      expect(
        screen.getByText(/marked completed and returned to the Service Engineer/)
      ).toBeInTheDocument()
    );
    expect(onWorkflowChange).toHaveBeenCalled();
  });
});
