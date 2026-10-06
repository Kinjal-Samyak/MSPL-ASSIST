import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store';
import { coordinatorService } from '@/features/coordinator/services/coordinatorService';
import { technicianConsoleService } from '@/features/technician/services/technicianConsoleService';
import { ticketService } from '@/services/ticketService';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
}

const POLL_INTERVAL_MS = 60000;

export function NotificationsMenu() {
  const role = useAuthStore((state) => state.user?.role);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setLoading(true);
      const nextItems: ActionItem[] = [];

      try {
        if (role === 'SERVICE_TL' || role === 'ADMIN' || role === 'SERVICE_MANAGER') {
          const pending = await ticketService.listPendingClosureRequests();
          if (pending.length > 0) {
            nextItems.push({
              id: 'closure-requests',
              title: 'Closure requests awaiting approval',
              description: `${pending.length} ticket${pending.length === 1 ? '' : 's'} need your decision`,
              count: pending.length,
              href: ROUTES.SERVICE_TL,
            });
          }
        }

        if (role === 'COORDINATOR' || role === 'ADMIN' || role === 'SERVICE_MANAGER') {
          const summary = (await coordinatorService.getWorkbenchSummary()) as unknown as {
            workflowStageCounts?: Record<string, number>;
          };
          const created = Number(summary.workflowStageCounts?.CREATED ?? 0);
          const rfd = Number(summary.workflowStageCounts?.RFD ?? 0);
          if (created > 0) {
            nextItems.push({
              id: 'created',
              title: 'Tickets awaiting Service Engineer assignment',
              description: `${created} new ticket${created === 1 ? '' : 's'}`,
              count: created,
              href: ROUTES.COORDINATOR_TICKETS,
            });
          }
          if (rfd > 0) {
            nextItems.push({
              id: 'rfd',
              title: 'Tickets ready to close',
              description: `${rfd} ticket${rfd === 1 ? '' : 's'} ready for delivery`,
              count: rfd,
              href: ROUTES.COORDINATOR_TICKETS,
            });
          }
        }

        if (role === 'TECHNICIAN' || role === 'ADMIN' || role === 'SERVICE_MANAGER') {
          /** Document 9, Phase 9.2: use the technician console dashboard's `assignedJobs` count
           * rather than filtering job cards to IN_PROGRESS only - a newly assigned ticket has no
           * job card yet, so the old check silently missed the exact moment this notification
           * is meant to fire (right after assignment). */
          const dashboard = await technicianConsoleService.dashboard();
          if (dashboard.assignedJobs > 0) {
            nextItems.push({
              id: 'assigned-jobs',
              title: 'Jobs assigned to you',
              description: `${dashboard.assignedJobs} job${dashboard.assignedJobs === 1 ? '' : 's'} assigned to you`,
              count: dashboard.assignedJobs,
              href: ROUTES.TECHNICIAN_ACTIVE,
            });
          }
        }
      } catch {
        // Notifications degrade silently - the bell just shows nothing rather than erroring the header.
      }

      if (!isCancelled) {
        setItems(nextItems);
        setLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div ref={containerRef} className="relative">
      <Tooltip content="Notifications">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={totalCount > 0 ? `Notifications, ${totalCount} pending` : 'Notifications'}
          aria-expanded={open}
          className="relative rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </button>
      </Tooltip>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Needs your attention
          </p>
          {loading && items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(item.href);
                    }}
                    className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
