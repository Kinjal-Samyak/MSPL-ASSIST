export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'INSPECTION'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PARTS'
  | 'READY'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'NEW'
  | 'ON_HOLD'
  | 'RESOLVED';

export type TicketSlaState = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

export type SlaStatusValue = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED' | 'COMPLETED_LATE';
export type StageStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';

export interface TicketCurrentStage {
  key: string;
  label: string;
  status: StageStatus;
}

export interface TicketOwnerInfo {
  role: string;
  name: string | null;
}

export interface TicketSlaStatusInfo {
  status: SlaStatusValue;
  dueBy: string | null;
}

export interface TicketStageProgressItem {
  key: string;
  label: string;
  ownerRole: string;
  ownerName: string | null;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  dueBy: string | null;
  slaStatus: SlaStatusValue | null;
  notApplicable: boolean;
}

export interface TicketWorkshopSla {
  status: SlaStatusValue;
  startedAt: string;
  dueBy: string;
  completedAt: string | null;
}

export interface TicketPriorityChange {
  id: string;
  previousPriority: TicketPriority;
  newPriority: TicketPriority;
  reason: string;
  changedByName: string;
  changedByRole: string;
  createdAt: string;
}

export type TicketWorkflowStage =
  | 'CREATED'
  | 'SERVICE_TL_REVIEW'
  | 'CONSULTATION_RESOLVED'
  | 'WORKSHOP_REQUIRED'
  | 'RFD'
  | 'REOPENED';

export type JobCardStage = 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'RFD';

export type TimelineIcon =
  | 'TICKET_CREATED'
  | 'ASSIGNED'
  | 'INSPECTION'
  | 'REPAIR'
  | 'PARTS'
  | 'ETA'
  | 'CHARGES'
  | 'COMMENT'
  | 'ATTACHMENT'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

export interface TicketTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  icon: TimelineIcon;
}

export interface TicketComment {
  id: string;
  author: string;
  timestamp: string;
  message: string;
  channel: 'COORDINATOR' | 'TECHNICIAN' | 'CUSTOMER' | 'SYSTEM';
}

export interface TicketAttachment {
  id: string;
  name: string;
  fileType: 'IMAGE' | 'PDF' | 'DOCX' | 'INVOICE' | 'SERVICE_REPORT';
  uploadedAt: string;
  uploadedBy: string;
}

export type TicketActivityType =
  | 'STATUS_CHANGED'
  | 'ETA_UPDATED'
  | 'TECHNICIAN_ASSIGNED'
  | 'CHARGE_UPDATED'
  | 'COMMENT_ADDED'
  | 'ATTACHMENT_UPLOADED'
  | 'ATTACHMENT_DELETED'
  | 'WHATSAPP_NOTIFICATION_SENT'
  | 'SYSTEM_GENERATED_EVENT';

export interface TicketActivityLogEntry {
  id: string;
  timestamp: string;
  activityType: TicketActivityType;
  detail: string;
  user?: string;
}

export interface TicketNotificationHistoryEntry {
  id: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'REMINDER';
  recipient: string;
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  riderName: string;
  customer: string;
  phone: string;
  alternatePhone: string;
  email: string;
  customerAddress: string;
  vehicle: string;
  batteryNumber: string;
  vin: string;
  model: string;
  hub: string;
  deploymentDate: string;
  category: string;
  issueType: string;
  priority: TicketPriority;
  status: TicketStatus;
  workflowStage: TicketWorkflowStage;
  serviceTlId: string | null;
  serviceTlName: string | null;
  jobCardStage: JobCardStage | null;
  jobCardNumber: string | null;
  jobCardEffectiveStatusLabel: string | null;
  jobCardTechnicianId: string | null;
  jobCardTechnicianName: string | null;
  assignedTechnician: string;
  createdAt: string;
  slaState: TicketSlaState;
  issueSummary: string;
  eta: string;
  estimatedCharges: number;
  actualCharges: number;
  discount: number;
  securityDeposit: number;
  outstanding: number;
  lastActivity: string;
  assignmentDate: string;
  technicianMobile: string;
  workshop: string;
  currentStage: TicketCurrentStage;
  owner: TicketOwnerInfo;
  slaStatus: TicketSlaStatusInfo;
  workshopSla: TicketWorkshopSla | null;
  stageProgress: TicketStageProgressItem[];
  closedAt: string | null;
  timelinePreview: TicketTimelineEvent[];
  comments: TicketComment[];
  attachments: TicketAttachment[];
  activityLog: TicketActivityLogEntry[];
  notificationHistory: TicketNotificationHistoryEntry[];
}

export interface TicketFiltersState {
  search: string;
  hub: string;
  priority: string;
  status: string;
  category: string;
  technician: string;
  vehicleModel: string;
  vehicleType: string;
  startDate: string;
  endDate: string;
}

export interface TicketFilterOptions {
  hubs: string[];
  priorities: TicketPriority[];
  statuses: TicketStatus[];
  categories: string[];
  technicians: string[];
  vehicleModels: string[];
}
