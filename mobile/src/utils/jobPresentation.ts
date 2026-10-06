import type { BadgeVariant } from '@/components';
import type { JobCardStage, OperationalPriority, RideabilityStatus } from '@/models';

/** Tone mapping only - pure presentation, no business rules. Mirrors the tone conventions used by
 * the web app's TicketStatusBadge/TicketPriorityBadge (frontend/src/features/tickets/components),
 * re-keyed to the real JobCard/Ticket enum values (JobCardStage, the Prisma `Priority` enum) since
 * the web components key off a different, ticket-list-specific status/priority shape. */
const STATUS_VARIANT: Record<JobCardStage, BadgeVariant> = {
  IN_PROGRESS: 'warning',
  WAITING_PARTS: 'warning',
  COMPLETED: 'success',
  RFD: 'success',
};

const PRIORITY_VARIANT: Record<OperationalPriority, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

const RIDEABILITY_VARIANT: Record<RideabilityStatus, BadgeVariant> = {
  MOVABLE: 'success',
  NOT_MOVABLE: 'danger',
};

const RIDEABILITY_LABEL: Record<RideabilityStatus, string> = {
  MOVABLE: 'Movable',
  NOT_MOVABLE: 'Not Movable',
};

export function getStatusBadgeVariant(status: JobCardStage): BadgeVariant {
  return STATUS_VARIANT[status];
}

export function getPriorityBadgeVariant(priority: OperationalPriority): BadgeVariant {
  return PRIORITY_VARIANT[priority];
}

export function getRideabilityBadgeVariant(status: RideabilityStatus): BadgeVariant {
  return RIDEABILITY_VARIANT[status];
}

export function getRideabilityLabel(status: RideabilityStatus): string {
  return RIDEABILITY_LABEL[status];
}

export function getPriorityLabel(priority: OperationalPriority): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}
