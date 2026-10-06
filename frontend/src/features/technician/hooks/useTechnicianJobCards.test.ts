import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTechnicianJobCards } from './useTechnicianJobCards';
import { ticketService, type JobCardListItem } from '@/services/ticketService';
import type * as ticketServiceModule from '@/services/ticketService';
import { useAuthStore } from '@/store/authStore';
import { ACTIVE_JOB_CARD_STAGES, COMPLETED_JOB_CARD_STAGES } from '../constants';

vi.mock('@/services/ticketService', async () => {
  const actual = await vi.importActual<typeof ticketServiceModule>('@/services/ticketService');
  return { ...actual, ticketService: { ...actual.ticketService, listJobCards: vi.fn() } };
});

function buildJobCard(overrides: Partial<JobCardListItem>): JobCardListItem {
  return {
    id: overrides.id ?? 'jc-1',
    ticketId: overrides.ticketId ?? 'ticket-1',
    ticketNumber: overrides.ticketNumber ?? 'MV-001',
    workflowStage: overrides.workflowStage ?? 'IN_PROGRESS',
    effectiveStatus: overrides.effectiveStatus ?? 'IN_PROGRESS',
    effectiveStatusLabel: overrides.effectiveStatusLabel ?? 'In Progress',
    technicianId: overrides.technicianId ?? 'tech-1',
    customerName: overrides.customerName ?? 'Asha',
    issueDescription: overrides.issueDescription ?? 'Brake noise',
    createdAt: overrides.createdAt ?? '2026-07-20T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-20T00:00:00.000Z',
  };
}

describe('useTechnicianJobCards', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'tech-1', name: 'Ravi', email: 'ravi@example.com', role: 'TECHNICIAN' },
    });
  });

  it('narrows the job card list to the requested workflow stages', async () => {
    vi.mocked(ticketService.listJobCards).mockResolvedValue([
      buildJobCard({ id: 'a', workflowStage: 'IN_PROGRESS' }),
      buildJobCard({ id: 'b', workflowStage: 'WAITING_PARTS' }),
      buildJobCard({ id: 'c', workflowStage: 'COMPLETED' }),
      buildJobCard({ id: 'd', workflowStage: 'RFD' }),
    ]);

    const { result } = renderHook(() => useTechnicianJobCards(ACTIVE_JOB_CARD_STAGES));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobCards.map((jobCard) => jobCard.id).sort()).toEqual(['a', 'b']);
  });

  it('filters the Completed set to COMPLETED and RFD only', async () => {
    vi.mocked(ticketService.listJobCards).mockResolvedValue([
      buildJobCard({ id: 'a', workflowStage: 'IN_PROGRESS' }),
      buildJobCard({ id: 'c', workflowStage: 'COMPLETED' }),
      buildJobCard({ id: 'd', workflowStage: 'RFD' }),
    ]);

    const { result } = renderHook(() => useTechnicianJobCards(COMPLETED_JOB_CARD_STAGES));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobCards.map((jobCard) => jobCard.id).sort()).toEqual(['c', 'd']);
  });

  it('applies the search filter on top of the stage filter', async () => {
    vi.mocked(ticketService.listJobCards).mockResolvedValue([
      buildJobCard({
        id: 'a',
        ticketNumber: 'MV-001',
        customerName: 'Asha',
        workflowStage: 'IN_PROGRESS',
      }),
      buildJobCard({
        id: 'b',
        ticketNumber: 'MV-002',
        customerName: 'Deepak',
        workflowStage: 'IN_PROGRESS',
      }),
    ]);

    const { result } = renderHook(() => useTechnicianJobCards(ACTIVE_JOB_CARD_STAGES));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch('deepak'));

    await waitFor(() =>
      expect(result.current.visibleJobCards.map((jobCard) => jobCard.id)).toEqual(['b'])
    );
  });
});
