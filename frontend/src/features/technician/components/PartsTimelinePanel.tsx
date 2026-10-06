import { Timeline, type TimelineEntry } from '@/components/ui';
import type { PartsTimelineEventItem, PartsTimelineStage } from '@/services/ticketService';

const STAGE_LABEL: Record<PartsTimelineStage, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ISSUED: 'Issued',
  CONSUMED: 'Consumed',
  RETURN_REQUESTED: 'Return Requested',
  RETURNED: 'Returned',
  PENDING_PROCUREMENT: 'Pending Procurement',
};

const STAGE_TONE: Record<PartsTimelineStage, TimelineEntry['tone']> = {
  REQUESTED: 'default',
  APPROVED: 'success',
  REJECTED: 'danger',
  ISSUED: 'success',
  CONSUMED: 'default',
  RETURN_REQUESTED: 'warning',
  RETURNED: 'success',
  PENDING_PROCUREMENT: 'warning',
};

interface PartsTimelinePanelProps {
  events: PartsTimelineEventItem[];
}

/** Read-only rendering of the Job Card Parts Timeline - the events are computed server-side by
 * merging existing spare-part-request, return-request, inventory-transaction and procurement data
 * (see TicketWorkflowService.buildPartsTimeline). Nothing here recomputes or infers status. */
export function PartsTimelinePanel({ events }: PartsTimelinePanelProps) {
  const items: TimelineEntry[] = events.map((event, index) => ({
    id: `${event.stage}-${event.partId}-${event.timestamp}-${index}`,
    title: `${STAGE_LABEL[event.stage]} — ${event.partCode} · ${event.partName} × ${event.quantity}`,
    description: event.remarks ?? undefined,
    timestamp: event.timestamp,
    actor: event.userName ?? undefined,
    tone: STAGE_TONE[event.stage],
  }));

  return <Timeline items={items} emptyMessage="No part activity recorded for this job card yet." />;
}
