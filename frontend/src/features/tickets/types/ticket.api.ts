import type {
  TicketDetailResponse,
  TicketListItemResponse,
  TicketListQuery,
} from '@/services/ticketService';
import type { Ticket, TicketPriority, TicketStatus, TimelineIcon } from './ticket.types';

function mapPriority(priority: string): TicketPriority {
  const normalized = priority.toUpperCase();
  if (normalized === 'CRITICAL') return 'P1';
  if (normalized === 'HIGH') return 'P2';
  if (normalized === 'MEDIUM') return 'P3';
  return 'P4';
}

export function toBackendPriority(
  priority: TicketPriority
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (priority === 'P1') return 'CRITICAL';
  if (priority === 'P2') return 'HIGH';
  if (priority === 'P3') return 'MEDIUM';
  return 'LOW';
}

function mapStatus(status: string): TicketStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'open') return 'OPEN';
  if (normalized === 'assigned') return 'ASSIGNED';
  if (normalized === 'inspection') return 'INSPECTION';
  if (normalized === 'in progress') return 'IN_PROGRESS';
  if (normalized === 'waiting for parts') return 'WAITING_FOR_PARTS';
  if (normalized === 'ready') return 'READY';
  if (normalized === 'delivered') return 'DELIVERED';
  if (normalized === 'closed') return 'CLOSED';
  if (normalized === 'cancelled') return 'CANCELLED';
  return 'OPEN';
}

export function toBackendStatus(status: TicketStatus): string {
  if (status === 'IN_PROGRESS') return 'In Progress';
  if (status === 'WAITING_FOR_PARTS') return 'Waiting For Parts';
  if (status === 'NEW') return 'Open';
  if (status === 'ON_HOLD') return 'Inspection';
  if (status === 'RESOLVED') return 'Ready';
  const capitalized = status.toLowerCase().replace(/_/g, ' ');
  return capitalized.replace(/\b\w/g, (value) => value.toUpperCase());
}

function getTimelineIcon(title: string, newStatus: string | null): TimelineIcon {
  const status = mapStatus(newStatus ?? '');
  if (title.toLowerCase().includes('comment')) return 'COMMENT';
  if (title.toLowerCase().includes('attachment')) return 'ATTACHMENT';
  if (status === 'ASSIGNED') return 'ASSIGNED';
  if (status === 'INSPECTION') return 'INSPECTION';
  if (status === 'IN_PROGRESS') return 'REPAIR';
  if (status === 'WAITING_FOR_PARTS') return 'PARTS';
  if (status === 'READY') return 'COMPLETED';
  if (status === 'DELIVERED') return 'DELIVERED';
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'TICKET_CREATED';
}

function toCurrencyNumber(value: number | null): number {
  return value ?? 0;
}

export function mapTicketListItemToTicket(item: TicketListItemResponse): Ticket {
  const createdAt = item.createdAt;
  const eta = item.eta ?? createdAt;
  const assignedTechnician = item.technician ?? 'Unassigned';

  return {
    id: item.id,
    ticketNumber: item.ticketNumber,
    riderName: item.customerName,
    customer: item.customerName,
    phone: item.phoneNumber,
    alternatePhone: '',
    email: '',
    customerAddress: '',
    vehicle: item.vehicleNumber ?? 'NA',
    batteryNumber: item.mvTrackNumber ?? '',
    vin: '',
    model: item.vehicleModel ?? '',
    hub: item.hub ?? 'NA',
    deploymentDate: createdAt,
    category: item.category,
    issueType: '',
    priority: mapPriority(item.priority),
    status: mapStatus(item.status),
    workflowStage: item.workflowStage,
    serviceTlId: null,
    serviceTlName: item.serviceTl ?? null,
    jobCardStage: item.jobCardStage,
    jobCardNumber: item.jobCardNumber,
    jobCardEffectiveStatusLabel: item.jobCardEffectiveStatusLabel,
    jobCardTechnicianId: null,
    jobCardTechnicianName: item.jobCardTechnician,
    assignedTechnician,
    createdAt,
    slaState: 'ON_TRACK',
    issueSummary: '',
    eta,
    estimatedCharges: 0,
    actualCharges: 0,
    discount: 0,
    securityDeposit: 0,
    outstanding: 0,
    lastActivity: createdAt,
    assignmentDate: createdAt,
    technicianMobile: '',
    workshop: '',
    currentStage: item.currentStage,
    owner: item.owner,
    slaStatus: item.slaStatus,
    workshopSla: null,
    stageProgress: [],
    closedAt: null,
    timelinePreview: [],
    comments: [],
    attachments: [],
    activityLog: [],
    notificationHistory: [],
  };
}

export function mapTicketDetailToTicket(detail: TicketDetailResponse, base?: Ticket): Ticket {
  const estimated = toCurrencyNumber(detail.financialSummary.estimatedCharges);
  const actual = toCurrencyNumber(detail.financialSummary.finalCharges);
  const discount = Math.max(estimated - actual, 0);
  const securityDeposit = base?.securityDeposit ?? 0;

  return {
    id: detail.ticketSummary.id,
    ticketNumber: detail.ticketSummary.ticketNumber,
    riderName: detail.customer.name,
    customer: detail.customer.name,
    phone: detail.customer.registeredMobile,
    alternatePhone: detail.customer.secondaryMobile ?? '',
    email: base?.email ?? '',
    customerAddress: base?.customerAddress ?? '',
    vehicle: detail.vehicle.vehicleNumber ?? 'NA',
    batteryNumber: detail.vehicle.mvTrackNumber ?? '',
    vin: base?.vin ?? '',
    model: detail.vehicle.vehicleModel ?? '',
    hub: detail.vehicle.hub ?? 'NA',
    deploymentDate: base?.deploymentDate ?? detail.ticketSummary.createdAt,
    category: detail.ticketSummary.category,
    issueType: base?.issueType ?? detail.ticketSummary.category,
    priority: mapPriority(detail.ticketSummary.priority),
    status: mapStatus(detail.ticketSummary.status),
    workflowStage: detail.ticketSummary.workflowStage,
    serviceTlId: detail.serviceTl.id,
    serviceTlName: detail.serviceTl.name,
    jobCardStage: detail.jobCard?.workflowStage ?? null,
    jobCardNumber: base?.jobCardNumber ?? null,
    jobCardEffectiveStatusLabel: base?.jobCardEffectiveStatusLabel ?? null,
    jobCardTechnicianId: detail.jobCard?.technicianId ?? null,
    jobCardTechnicianName: detail.jobCard?.technicianName ?? null,
    assignedTechnician: detail.technician.name ?? 'Unassigned',
    createdAt: detail.ticketSummary.createdAt,
    slaState: base?.slaState ?? 'ON_TRACK',
    issueSummary: detail.ticketSummary.issueDescription,
    eta: detail.ticketSummary.eta ?? detail.ticketSummary.createdAt,
    estimatedCharges: estimated,
    actualCharges: actual,
    discount,
    securityDeposit,
    outstanding: Math.max(actual - discount - securityDeposit, 0),
    lastActivity:
      detail.activityLog[0]?.performedAt ??
      detail.timeline[0]?.timestamp ??
      detail.ticketSummary.updatedAt,
    assignmentDate: base?.assignmentDate ?? detail.ticketSummary.updatedAt,
    technicianMobile: base?.technicianMobile ?? '',
    workshop: detail.vehicle.hub ?? base?.workshop ?? '',
    currentStage: base?.currentStage ?? {
      key: detail.ticketSummary.workflowStage,
      label: detail.ticketSummary.workflowStage,
      status: 'IN_PROGRESS',
    },
    owner: base?.owner ?? { role: 'COORDINATOR', name: null },
    slaStatus: base?.slaStatus ?? { status: 'ON_TRACK', dueBy: null },
    workshopSla: detail.workshopSla,
    stageProgress: detail.stageProgress,
    closedAt: detail.ticketSummary.closedAt,
    timelinePreview: detail.timeline.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      title: event.title,
      description: event.description,
      icon: getTimelineIcon(event.title, event.newStatus),
    })),
    comments: detail.comments.map((comment) => ({
      id: comment.id,
      author: comment.userName ?? 'System',
      timestamp: comment.createdAt,
      message: comment.text,
      channel: comment.isInternal
        ? 'COORDINATOR'
        : comment.userRole?.toUpperCase().includes('TECH')
          ? 'TECHNICIAN'
          : comment.userRole?.toUpperCase().includes('SYSTEM')
            ? 'SYSTEM'
            : 'CUSTOMER',
    })),
    attachments: detail.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.fileUrl.split('/').pop() ?? attachment.fileType,
      fileType: attachment.fileType.toUpperCase().includes('IMAGE')
        ? 'IMAGE'
        : attachment.fileType.toUpperCase().includes('DOC')
          ? 'DOCX'
          : 'PDF',
      uploadedAt: attachment.uploadedAt,
      uploadedBy: 'System',
    })),
    activityLog: detail.activityLog.map((entry) => ({
      id: entry.id,
      timestamp: entry.performedAt,
      activityType:
        entry.activityType === 'Status Updated'
          ? 'STATUS_CHANGED'
          : entry.activityType === 'ETA Updated'
            ? 'ETA_UPDATED'
            : entry.activityType === 'Technician Assigned'
              ? 'TECHNICIAN_ASSIGNED'
              : entry.activityType === 'Charges Updated'
                ? 'CHARGE_UPDATED'
                : entry.activityType === 'Comment Added'
                  ? 'COMMENT_ADDED'
                  : entry.activityType === 'Attachment Uploaded'
                    ? 'ATTACHMENT_UPLOADED'
                    : 'SYSTEM_GENERATED_EVENT',
      detail: entry.description,
      user: entry.performedBy ?? undefined,
    })),
    notificationHistory: detail.notificationHistory.map((entry) => ({
      id: entry.id,
      channel:
        entry.channel.toUpperCase() === 'WHATSAPP'
          ? 'WHATSAPP'
          : entry.channel.toUpperCase() === 'SMS'
            ? 'SMS'
            : entry.channel.toUpperCase() === 'EMAIL'
              ? 'EMAIL'
              : 'REMINDER',
      recipient: entry.recipient,
      timestamp: entry.sentAt ?? detail.ticketSummary.updatedAt,
      status:
        entry.status.toUpperCase() === 'DELIVERED'
          ? 'DELIVERED'
          : entry.status.toUpperCase() === 'FAILED'
            ? 'FAILED'
            : entry.status.toUpperCase() === 'PENDING'
              ? 'PENDING'
              : 'SENT',
    })),
  };
}

export function mapSortToBackend(sortKey: string): TicketListQuery['sortBy'] {
  if (sortKey === 'ticketNumber') return 'ticketNumber';
  if (sortKey === 'priority') return 'priority';
  if (sortKey === 'status') return 'status';
  if (sortKey === 'customer') return 'customerName';
  if (sortKey === 'vehicle') return 'vehicleNumber';
  if (sortKey === 'createdAt') return 'createdAt';
  return 'createdAt';
}
