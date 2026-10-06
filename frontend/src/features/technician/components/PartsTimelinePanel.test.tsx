import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PartsTimelinePanel } from './PartsTimelinePanel';
import type { PartsTimelineEventItem } from '@/services/ticketService';

describe('PartsTimelinePanel', () => {
  it('shows an empty state when there are no events', () => {
    render(<PartsTimelinePanel events={[]} />);
    expect(
      screen.getByText('No part activity recorded for this job card yet.')
    ).toBeInTheDocument();
  });

  it('renders each event with its stage, part and quantity', () => {
    const events: PartsTimelineEventItem[] = [
      {
        stage: 'REQUESTED',
        partId: 'part-1',
        partCode: 'BRK001',
        partName: 'Brake Pad',
        quantity: 2,
        userId: 'user-1',
        userName: 'Ravi',
        timestamp: '2026-07-20T10:00:00.000Z',
        remarks: null,
      },
      {
        stage: 'ISSUED',
        partId: 'part-1',
        partCode: 'BRK001',
        partName: 'Brake Pad',
        quantity: 2,
        userId: 'user-2',
        userName: 'Priya',
        timestamp: '2026-07-20T11:00:00.000Z',
        remarks: 'Handed over at counter',
      },
    ];

    render(<PartsTimelinePanel events={events} />);

    expect(screen.getByText(/Requested — BRK001 · Brake Pad × 2/)).toBeInTheDocument();
    expect(screen.getByText(/Issued — BRK001 · Brake Pad × 2/)).toBeInTheDocument();
    expect(screen.getByText('Handed over at counter')).toBeInTheDocument();
  });
});
