import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartsWorkspace } from './PartsWorkspace';
import { ticketService, type JobCardSparePartItem } from '@/services/ticketService';
import type * as ticketServiceModule from '@/services/ticketService';

vi.mock('@/services/ticketService', async () => {
  const actual = await vi.importActual<typeof ticketServiceModule>('@/services/ticketService');
  return {
    ...actual,
    ticketService: {
      ...actual.ticketService,
      listSparePartRequests: vi.fn().mockResolvedValue([]),
      listSparePartReturnRequests: vi.fn().mockResolvedValue([]),
      searchParts: vi.fn().mockResolvedValue([]),
      requestSpareParts: vi.fn(),
      recordConsumedQuantity: vi.fn(),
      submitSparePartReturnRequest: vi.fn(),
    },
  };
});

const RECONCILED_PART: JobCardSparePartItem = {
  partId: 'part-1',
  partCode: 'BRK001',
  partName: 'Brake Pad',
  availableQuantity: 10,
  requiredQuantity: 2,
  partCost: '450.00',
  returnedQuantity: 0,
  remainingReturnable: 2,
  consumedQuantity: 2,
  unreconciledQuantity: 0,
  billableQuantity: 2,
  rate: '450.00',
  billableAmount: '900.00',
};

const PENDING_PART: JobCardSparePartItem = {
  partId: 'part-2',
  partCode: 'OIL010',
  partName: 'Engine Oil',
  availableQuantity: 20,
  requiredQuantity: 3,
  partCost: '120.00',
  returnedQuantity: 0,
  remainingReturnable: 3,
  consumedQuantity: 0,
  unreconciledQuantity: 3,
  billableQuantity: 0,
  rate: '120.00',
  billableAmount: '0.00',
};

describe('PartsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ticketService.listSparePartRequests).mockResolvedValue([]);
    vi.mocked(ticketService.listSparePartReturnRequests).mockResolvedValue([]);
  });

  it('labels a fully consumed/returned part as Reconciled and an untouched part as pending', async () => {
    render(
      <PartsWorkspace
        ticketId="ticket-1"
        spareParts={[RECONCILED_PART, PENDING_PART]}
        editable
        onSparePartsChanged={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(ticketService.listSparePartRequests).toHaveBeenCalledWith('ticket-1')
    );

    expect(screen.getByText('Reconciled')).toBeInTheDocument();
    expect(screen.getByText('Pending Consumption / Return')).toBeInTheDocument();
  });

  it('records consumption for a part and reports the updated row upward', async () => {
    const updated: JobCardSparePartItem = {
      ...PENDING_PART,
      consumedQuantity: 3,
      unreconciledQuantity: 0,
    };
    vi.mocked(ticketService.recordConsumedQuantity).mockResolvedValue(updated);
    const onSparePartsChanged = vi.fn();
    const user = userEvent.setup();

    render(
      <PartsWorkspace
        ticketId="ticket-1"
        spareParts={[PENDING_PART]}
        editable
        onSparePartsChanged={onSparePartsChanged}
      />
    );
    await waitFor(() => expect(ticketService.listSparePartRequests).toHaveBeenCalled());

    const row = screen.getByText('OIL010').closest('tr');
    if (!row) throw new Error('row not found');
    const input = within(row).getByLabelText('Consumed quantity for OIL010');
    await user.type(input, '3');
    await user.click(within(row).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(ticketService.recordConsumedQuantity).toHaveBeenCalledWith('ticket-1', {
        partId: 'part-2',
        consumedQuantity: 3,
      })
    );
    expect(onSparePartsChanged).toHaveBeenCalledWith([updated]);
  });

  it('submits a staged return request and reloads the return-request list, without approving anything', async () => {
    vi.mocked(ticketService.submitSparePartReturnRequest).mockResolvedValue({
      id: 'ret-1',
      jobCardId: 'jc-1',
      ticketId: 'ticket-1',
      partId: 'part-1',
      partCode: 'BRK001',
      partName: 'Brake Pad',
      requestedReturnQuantity: 1,
      approvedReturnQuantity: null,
      status: 'PENDING',
      requestedById: 'user-1',
      requestedByName: 'Ravi',
      requestedAt: '2026-07-27T00:00:00.000Z',
      decidedById: null,
      decidedByName: null,
      decidedAt: null,
      decisionRemarks: null,
    });
    const user = userEvent.setup();

    render(
      <PartsWorkspace
        ticketId="ticket-1"
        spareParts={[RECONCILED_PART]}
        editable
        onSparePartsChanged={vi.fn()}
      />
    );
    await waitFor(() => expect(ticketService.listSparePartReturnRequests).toHaveBeenCalled());

    const row = screen.getByText('BRK001').closest('tr');
    if (!row) throw new Error('row not found');
    const input = within(row).getByLabelText('Return quantity for BRK001');
    await user.type(input, '1');
    await user.click(within(row).getByRole('button', { name: 'Submit Return' }));

    await waitFor(() =>
      expect(ticketService.submitSparePartReturnRequest).toHaveBeenCalledWith('ticket-1', {
        partId: 'part-1',
        requestedReturnQuantity: 1,
      })
    );
    // Approve/reject are never exposed here - only the read-only status list.
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    await waitFor(() => expect(ticketService.listSparePartReturnRequests).toHaveBeenCalledTimes(2));
  });
});
