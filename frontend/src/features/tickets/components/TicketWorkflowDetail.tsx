import { useEffect, useState } from 'react';
import { ChevronRight, Clock3, FileText, Image, ReceiptText } from 'lucide-react';
import { Badge, Card, CardHeader, CardTitle } from '@/components/ui';
import { formatDateTime } from '@/utils';
import { ticketService, type JobCardDetail } from '@/services/ticketService';
import { toApiErrorMessage } from '@/services/apiService';
import type { Ticket, TicketAttachment } from '@/features/tickets/types/ticket.types';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTimeline } from './TicketTimeline';
import { TicketSlaKpiCard } from './TicketSlaKpiCard';
import { TicketStageProgress } from './TicketStageProgress';
import { TicketPriorityChangeAction } from './TicketPriorityChangeAction';

interface TicketWorkflowDetailProps {
  ticket: Ticket | null;
  onTicketUpdated?: () => void;
}

type MilestoneTone = 'done' | 'current' | 'pending' | 'stopped';

interface MilestoneStep {
  key: string;
  label: string;
  tone: MilestoneTone;
}

const MILESTONE_BADGE_VARIANT: Record<MilestoneTone, 'success' | 'info' | 'neutral' | 'danger'> = {
  done: 'success',
  current: 'info',
  pending: 'neutral',
  stopped: 'danger',
};

const COMMENT_STYLE_MAP: Record<Ticket['comments'][number]['channel'], string> = {
  COORDINATOR: 'bg-indigo-50 dark:bg-indigo-900/20',
  TECHNICIAN: 'bg-gray-50 dark:bg-gray-800/60',
  CUSTOMER: 'bg-blue-50 dark:bg-blue-900/20',
  SYSTEM: 'bg-amber-50 dark:bg-amber-900/20',
};

const COMMENT_ROLE_MAP: Record<Ticket['comments'][number]['channel'], string> = {
  COORDINATOR: 'Internal Note',
  TECHNICIAN: 'Technician Note',
  CUSTOMER: 'Rider Note',
  SYSTEM: 'System Note',
};

function getAttachmentIcon(fileType: TicketAttachment['fileType']) {
  if (fileType === 'IMAGE') return <Image className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  if (fileType === 'INVOICE')
    return <ReceiptText className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  return <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
}

function buildMilestones(ticket: Ticket): MilestoneStep[] {
  const isCancelled = ticket.status === 'CANCELLED';
  const isClosed = ticket.status === 'CLOSED';
  const steps: MilestoneStep[] = [{ key: 'CREATED', label: 'Ticket Created', tone: 'done' }];

  if (isCancelled) {
    steps.push({ key: 'CANCELLED', label: 'Cancelled', tone: 'stopped' });
    return steps;
  }

  const reviewReached = ticket.workflowStage !== 'CREATED';
  steps.push({
    key: 'SERVICE_TL_REVIEW',
    label: ticket.serviceTlName
      ? `Service Engineer Review — ${ticket.serviceTlName}`
      : 'Service Engineer Review',
    tone: reviewReached ? 'done' : 'current',
  });

  if (ticket.workflowStage === 'CONSULTATION_RESOLVED') {
    steps.push({ key: 'CONSULTATION_RESOLVED', label: 'Resolved by Consultation', tone: 'done' });
    steps.push({ key: 'CLOSED', label: 'Closed', tone: isClosed ? 'current' : 'pending' });
    return steps;
  }

  const jobCardStarted =
    ticket.workflowStage === 'WORKSHOP_REQUIRED' || ticket.workflowStage === 'RFD';
  const rfdReached = ticket.jobCardStage === 'RFD';
  steps.push({
    key: 'WORKSHOP_REQUIRED',
    label: 'Workshop / Job Card',
    tone: !jobCardStarted ? 'pending' : rfdReached || isClosed ? 'done' : 'current',
  });
  steps.push({
    key: 'RFD',
    label: 'Ready for Deployment',
    tone: !rfdReached ? 'pending' : isClosed ? 'done' : 'current',
  });
  steps.push({ key: 'CLOSED', label: 'Closed', tone: isClosed ? 'current' : 'pending' });

  return steps;
}

export function TicketWorkflowDetail({ ticket, onTicketUpdated }: TicketWorkflowDetailProps) {
  const [jobCard, setJobCard] = useState<JobCardDetail | null>(null);
  const [jobCardLoading, setJobCardLoading] = useState(false);
  const [jobCardError, setJobCardError] = useState('');

  useEffect(() => {
    if (!ticket?.jobCardStage) {
      setJobCard(null);
      return;
    }
    let isCancelled = false;
    setJobCardLoading(true);
    setJobCardError('');
    ticketService
      .getTicketJobCard(ticket.id)
      .then((detail) => {
        if (!isCancelled) setJobCard(detail);
      })
      .catch((error) => {
        if (!isCancelled) setJobCardError(toApiErrorMessage(error));
      })
      .finally(() => {
        if (!isCancelled) setJobCardLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [ticket?.id, ticket?.jobCardStage]);

  if (!ticket) {
    return (
      <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
        <CardTitle>Ticket Workflow</CardTitle>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Select a ticket row to view its full workflow, job card and history.
        </p>
      </Card>
    );
  }

  const milestones = buildMilestones(ticket);
  const sortedComments = [...ticket.comments].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp)
  );
  const sortedAttachments = [...ticket.attachments].sort((left, right) =>
    right.uploadedAt.localeCompare(left.uploadedAt)
  );

  return (
    <Card className="rounded-xl border-gray-200/80 dark:border-gray-800/80" padding="md">
      <CardHeader className="mb-3">
        <div>
          <CardTitle>{ticket.ticketNumber}</CardTitle>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ticket.category}</p>
        </div>
        <div className="flex items-center gap-2">
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketStatusBadge status={ticket.status} />
        </div>
      </CardHeader>

      <div className="space-y-4">
        <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Milestones Reached
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {milestones.map((step, index) => (
              <div key={step.key} className="flex items-center gap-1.5">
                <Badge variant={MILESTONE_BADGE_VARIANT[step.tone]}>{step.label}</Badge>
                {index !== milestones.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                )}
              </div>
            ))}
          </div>
        </section>

        {ticket.workshopSla && <TicketSlaKpiCard workshopSla={ticket.workshopSla} />}

        <TicketPriorityChangeAction ticket={ticket} onChanged={onTicketUpdated} />

        {ticket.stageProgress.length > 0 && (
          <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Stage Progress
            </h4>
            <TicketStageProgress stages={ticket.stageProgress} />
          </section>
        )}

        {ticket.jobCardStage && (
          <section className="rounded-md border border-gray-200/80 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Job Card {ticket.jobCardTechnicianName ? `· ${ticket.jobCardTechnicianName}` : ''}
              </h4>
              {jobCard && <Badge variant="warning">{jobCard.effectiveStatusLabel}</Badge>}
            </div>
            {jobCardLoading && <p className="mt-2 text-xs text-gray-400">Loading job card…</p>}
            {jobCardError !== '' && (
              <p className="mt-2 text-xs text-danger dark:text-red-400">{jobCardError}</p>
            )}
            {jobCard && (
              <div className="mt-2 space-y-3 text-sm">
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">
                      Initial Observation
                    </dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {jobCard.initialObservation || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Root Cause</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{jobCard.rootCause || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Work Performed</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {jobCard.workPerformed || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Technician Remarks</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {jobCard.technicianRemarks || '—'}
                    </dd>
                  </div>
                </dl>

                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Labour</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {jobCard.labourCharges ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Parts</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {jobCard.partsCharges ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Other</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {jobCard.otherCharges ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Total</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {jobCard.totalCharges ?? '—'}
                    </dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Spare Parts Used
                  </p>
                  {jobCard.spareParts.length === 0 ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      No spare parts recorded.
                    </p>
                  ) : (
                    <div className="mt-1 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 uppercase text-gray-500 dark:bg-gray-800/60">
                          <tr>
                            <th className="px-3 py-2">Part Code</th>
                            <th className="px-3 py-2">Part Name</th>
                            <th className="px-3 py-2">Required</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobCard.spareParts.map((part) => (
                            <tr
                              key={part.partId}
                              className="border-t border-gray-100 dark:border-gray-800"
                            >
                              <td className="px-3 py-2">{part.partCode}</td>
                              <td className="px-3 py-2">{part.partName}</td>
                              <td className="px-3 py-2">{part.requiredQuantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Ticket Summary
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Ticket Number</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {ticket.ticketNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Status</dt>
              <dd>
                <TicketStatusBadge status={ticket.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Priority</dt>
              <dd>
                <TicketPriorityBadge priority={ticket.priority} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Category</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Created Date</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatDateTime(ticket.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Last Updated</dt>
              <dd className="inline-flex items-center gap-1 text-gray-900 dark:text-gray-100">
                <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                {formatDateTime(ticket.lastActivity)}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Rider Information
          </h4>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Rider Name</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.riderName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Mobile Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Address</dt>
              <dd className="text-gray-700 dark:text-gray-300">{ticket.customerAddress}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Vehicle Information
          </h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Vehicle Number</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.vehicle}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Vehicle Model</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.model}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Hub</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.hub}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Technician</dt>
              <dd className="text-gray-900 dark:text-gray-100">{ticket.assignedTechnician}</dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Timeline
          </h4>
          <div className="mt-2">
            <TicketTimeline events={ticket.timelinePreview} />
          </div>
        </section>

        {sortedComments.length > 0 && (
          <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Comments
            </h4>
            <ul className="mt-2 space-y-1.5">
              {sortedComments.map((comment) => (
                <li
                  key={comment.id}
                  className={`rounded-md px-3 py-2 ${COMMENT_STYLE_MAP[comment.channel]}`}
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {comment.author} • {COMMENT_ROLE_MAP[comment.channel]} •{' '}
                    {formatDateTime(comment.timestamp)}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{comment.message}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sortedAttachments.length > 0 && (
          <section className="border-t border-gray-200 pt-3 dark:border-gray-800">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Attachments
            </h4>
            <ul className="mt-2 space-y-2">
              {sortedAttachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getAttachmentIcon(attachment.fileType)}</div>
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{attachment.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Uploaded by {attachment.uploadedBy} •{' '}
                        {formatDateTime(attachment.uploadedAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}
