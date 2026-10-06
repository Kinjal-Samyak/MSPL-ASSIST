import { useEffect, useState } from 'react';
import { Timeline, type TimelineEntry } from '@/components/ui';
import { toApiErrorMessage } from '@/services/apiService';
import { titleCaseFromCode } from '@/utils';
import { technicianConsoleService } from '../services/technicianConsoleService';

interface ActivityTimelinePanelProps {
  ticketId: string;
  /** Bumping this re-fetches - the parent increments it after any workflow action so the log
   * stays current without this component needing to know why it changed. */
  refreshKey: number;
}

/** Job Card Timeline / Activity Log - the existing per-ticket activity feed
 * (GET /technician/jobs/:ticketId/timeline), previously unused by any screen. Read-only; nothing
 * here is computed client-side. */
export function ActivityTimelinePanel({ ticketId, refreshKey }: ActivityTimelinePanelProps) {
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    technicianConsoleService
      .timeline(ticketId)
      .then((entries) => {
        if (!active) return;
        setItems(
          entries.map((entry) => ({
            id: entry.id,
            title: titleCaseFromCode(entry.action),
            description: entry.remarks,
            timestamp: entry.createdAt,
            actor: entry.technicianName,
          }))
        );
      })
      .catch((loadError) => {
        if (active) setError(toApiErrorMessage(loadError));
      });
    return () => {
      active = false;
    };
  }, [ticketId, refreshKey]);

  if (error) return <p className="text-xs text-danger">{error}</p>;
  return <Timeline items={items} emptyMessage="No activity recorded for this job card yet." />;
}
