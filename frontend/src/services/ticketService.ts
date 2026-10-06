import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface TicketListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  priority?: string;
  hub?: string;
  technician?: string;
  category?: string;
  vehicleType?: string;
  vehicleModel?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type TicketWorkflowStage =
  | 'CREATED'
  | 'SERVICE_TL_REVIEW'
  | 'CONSULTATION_RESOLVED'
  | 'WORKSHOP_REQUIRED'
  | 'RFD'
  | 'REOPENED';
export type JobCardStage = 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'RFD';

export type SlaStatusValue = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED' | 'COMPLETED_LATE';
export type StageStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';

export interface TicketCurrentStageResponse {
  key: string;
  label: string;
  status: StageStatus;
}

export interface TicketOwnerResponse {
  role: string;
  name: string | null;
}

export interface TicketSlaStatusResponse {
  status: SlaStatusValue;
  dueBy: string | null;
}

export interface TicketListItemResponse {
  id: string;
  ticketNumber: string;
  status: string;
  priority: string;
  customerName: string;
  phoneNumber: string;
  vehicleNumber: string | null;
  vehicleModel: string | null;
  mvTrackNumber: string | null;
  hub: string | null;
  technician: string | null;
  category: string;
  createdAt: string;
  eta: string | null;
  workflowStage: TicketWorkflowStage;
  serviceTl: string | null;
  jobCardNumber: string | null;
  jobCardStage: JobCardStage | null;
  jobCardEffectiveStatusLabel: string | null;
  jobCardTechnician: string | null;
  currentStage: TicketCurrentStageResponse;
  owner: TicketOwnerResponse;
  slaStatus: TicketSlaStatusResponse;
}

export interface TicketListResponse {
  items: TicketListItemResponse[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketStageProgressItemResponse {
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

export interface TicketWorkshopSlaResponse {
  status: SlaStatusValue;
  startedAt: string;
  dueBy: string;
  completedAt: string | null;
}

export interface TicketDetailResponse {
  ticketSummary: {
    id: string;
    ticketNumber: string;
    status: string;
    priority: string;
    source: string;
    issueDescription: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    eta: string | null;
    workflowStage: TicketWorkflowStage;
    closedAt: string | null;
  };
  workshopSla: TicketWorkshopSlaResponse;
  stageProgress: TicketStageProgressItemResponse[];
  customer: {
    id: string;
    name: string;
    registeredMobile: string;
    secondaryMobile: string | null;
  };
  vehicle: {
    deploymentId: string | null;
    vehicleNumber: string | null;
    mvTrackNumber: string | null;
    vehicleModel: string | null;
    hub: string | null;
    rentalStatus: string | null;
  };
  technician: {
    id: string | null;
    name: string | null;
  };
  serviceTl: {
    id: string | null;
    name: string | null;
  };
  jobCard: {
    id: string;
    workflowStage: JobCardStage;
    technicianId: string | null;
    technicianName: string | null;
  } | null;
  timeline: Array<{
    id: string;
    timestamp: string;
    title: string;
    description: string;
    oldStatus: string | null;
    newStatus: string | null;
    updatedBy: string | null;
  }>;
  comments: Array<{
    id: string;
    text: string;
    isInternal: boolean;
    createdAt: string;
    userName: string | null;
    userRole: string | null;
  }>;
  attachments: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: string;
  }>;
  financialSummary: {
    estimatedCharges: number | null;
    finalCharges: number | null;
    coordinatorNotes: string | null;
  };
  activityLog: Array<{
    id: string;
    activityType: string;
    description: string;
    performedAt: string;
    performedBy: string | null;
    metadata: unknown;
  }>;
  notificationHistory: Array<{
    id: string;
    channel: string;
    recipient: string;
    status: string;
    message: string;
    responseId: string | null;
    sentAt: string | null;
  }>;
}

export interface CreateTicketRequest {
  registeredMobile: string;
  issueCategoryId: string;
  issueDescription: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vehicleNumber?: string;
  mvTrackNumber?: string;
  coordinatorNotes?: string;
}

export interface CreateTicketResponse {
  existingTicket: boolean;
  ticketId?: string;
  ticketNumber: string;
  createdAt?: string;
  currentStatus?: string;
}

export interface CreateConversationTicketRequest {
  registeredMobile: string;
  mvTrackNumber: string;
  vehicleNumber?: string;
  rideabilityStatus: 'MOVABLE' | 'NOT_MOVABLE';
  issueGroups: Array<{
    issueCategoryId: string;
    issueSubcategory: string;
    description?: string;
  }>;
  remarks?: string;
  photoReferences?: Array<{
    fileUrl: string;
    fileType: string;
  }>;
  conversationMetadata?: Record<string, unknown>;
}

export interface AssignTechnicianRequest {
  technicianId: string;
  assignmentNotes?: string;
}

export interface UpdateStatusRequest {
  status: string;
  remarks?: string;
}

export interface UpdateEtaRequest {
  eta: string;
  reason: string;
}

export interface UpdateChargesRequest {
  labourCharges: number;
  partsCharges: number;
  discount: number;
  totalCharges: number;
}

export interface TicketWorkflowTransitionResponse {
  ticketId: string;
  previousStage: TicketWorkflowStage;
  newStage: TicketWorkflowStage;
  serviceTlId: string | null;
  updatedAt: string;
}

export interface JobCardWorkflowTransitionResponse {
  jobCardId: string;
  ticketId: string;
  previousStage: JobCardStage;
  newStage: JobCardStage;
  technicianId: string;
  updatedAt: string;
}

export interface AssignServiceTlRequest {
  serviceTlId: string;
  remarks?: string;
}

export interface TransferServiceTlRequest {
  serviceTlId: string;
  remarks?: string;
}

export interface RequireWorkshopRequest {
  technicianId: string;
  remarks?: string;
}

export interface TicketWorkflowRemarksRequest {
  remarks?: string;
  actualCompletionAt?: string;
  completedByName?: string;
}

export interface JobCardListItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  workflowStage: JobCardStage;
  effectiveStatus: string;
  effectiveStatusLabel: string;
  technicianId: string;
  customerName: string;
  issueDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketClosureRequest {
  id: string;
  ticketId: string;
  ticketNumber: string;
  requestType: 'CANCELLATION' | 'EARLY_CLOSURE';
  reasonCategory: 'ACCOUNT_CLOSURE' | 'VEHICLE_EXCHANGE' | 'VEHICLE_UPGRADE' | 'OTHER' | null;
  reason: string;
  paymentWaived: boolean;
  paymentWaiveRemarks: string | null;
  paymentMode: string | null;
  paymentUtrNumber: string | null;
  paymentAmount: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
}

/** Document 9, Phase 9.1 - Service Engineer Dashboard. Mirrors the backend
 * ServiceEngineerDashboardDto exactly. */
export interface ServiceEngineerDashboard {
  jobsByStatus: {
    created: number;
    review: number;
    workshopRequired: number;
    rfd: number;
  };
  jobsAwaitingAssignment: number;
  jobsAwaitingPartsApproval: number;
  jobsAwaitingGoodsIssue: number;
  jobsAwaitingReturnsVerification: number;
  jobsReadyForReview: number;
  jobsReadyForDelivery: number;
  overdueJobs: number;
  technicianAvailability: {
    available: number;
    busy: number;
    total: number;
  };
  workshopUtilizationPercent: number;
  inventoryAlerts: number;
  recentActivity: ServiceEngineerActivityItem[];
}

export interface ServiceEngineerActivityItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  activityType: string;
  description: string;
  performedByName: string | null;
  performedAt: string;
}

export interface JobCardSparePartItem {
  partId: string;
  partCode: string;
  partName: string;
  availableQuantity: number;
  requiredQuantity: number;
  partCost: string;
  /** Running total already returned to inventory for this job-card+part pair. */
  returnedQuantity: number;
  /** requiredQuantity - returnedQuantity - the cap on a further return-to-inventory action. */
  remainingReturnable: number;
  /** How much of requiredQuantity the Technician has recorded as actually used - never moves
   * inventory (stock already left Central Inventory at issue time). */
  consumedQuantity: number;
  /** requiredQuantity - consumedQuantity - returnedQuantity. Must reach exactly 0 before the Job
   * Card can be marked complete. */
  unreconciledQuantity: number;
  /** Final Spare Part Billing - always equal to consumedQuantity, never requested/approved/issued/
   * returned quantity. A live preview before RFD; frozen in JobCardDetail.finalBillingSnapshot
   * once Ready for Delivery is reached. */
  billableQuantity: number;
  rate: string;
  billableAmount: string;
}

export interface FinalBillingSnapshotItem {
  partId: string;
  partCode: string;
  partName: string;
  consumedQuantity: number;
  rate: string;
  amount: string;
}

export interface FinalBillingSnapshot {
  readyForDeliveryAt: string;
  readyForDeliveryById: string;
  readyForDeliveryByName: string;
  items: FinalBillingSnapshotItem[];
  finalSparePartsTotal: string;
}

export type PartsTimelineStage =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'CONSUMED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'PENDING_PROCUREMENT';

export interface PartsTimelineEventItem {
  stage: PartsTimelineStage;
  partId: string;
  partCode: string;
  partName: string;
  quantity: number;
  userId: string | null;
  userName: string | null;
  timestamp: string;
  remarks: string | null;
}

export type SparePartReturnRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SparePartReturnRequestItem {
  id: string;
  jobCardId: string;
  ticketId: string;
  partId: string;
  partCode: string;
  partName: string;
  requestedReturnQuantity: number;
  approvedReturnQuantity: number | null;
  status: SparePartReturnRequestStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
}

export interface CreateSparePartReturnRequestPayload {
  partId: string;
  requestedReturnQuantity: number;
}

export interface RecordConsumedQuantityPayload {
  partId: string;
  consumedQuantity: number;
}

export interface JobCardDetail {
  id: string;
  jobCardNumber: string;
  ticketId: string;
  ticketNumber: string;
  workflowStage: JobCardStage;
  effectiveStatus: string;
  effectiveStatusLabel: string;
  technicianId: string;
  technicianName: string;
  createdAt: string;
  createdBy: string;
  initialObservation: string | null;
  rootCause: string | null;
  workPerformed: string | null;
  otherRequirements: string | null;
  technicianRemarks: string | null;
  labourCharges: string | null;
  partsCharges: string | null;
  otherCharges: string | null;
  totalCharges: string | null;
  estimatedCompletionAt: string | null;
  actualCompletionAt: string | null;
  completedByName: string | null;
  closureRemarks: string | null;
  version: number;
  lastEditedAt: string | null;
  partsRequisitionNumber: string | null;
  partsRequisitionCreatedAt: string | null;
  partsRequisitionClosedAt: string | null;
  updatedAt: string;
  repairStartedAt: string | null;
  /** Final Spare Part Billing - null until the Service Engineer clicks Ready for Deployment, at which
   * point the job card becomes the official financial record for spare parts and these freeze
   * for good. */
  readyForDeliveryAt: string | null;
  readyForDeliveryByName: string | null;
  finalSparePartsAmount: string | null;
  finalBillingSnapshot: FinalBillingSnapshot | null;
  spareParts: JobCardSparePartItem[];
  partsTimeline: PartsTimelineEventItem[];
  editable: boolean;
  rider: {
    name: string;
    mobile: string;
    mvTrackNumber: string | null;
    vehicleModel: string | null;
    vehicleType: string | null;
    registrationNumber: string | null;
    hub: string | null;
  };
  complaint: {
    rideabilityStatus: string | null;
    issueCategory: string;
    issueSubcategory: string | null;
    riderRemarks: string | null;
    riderPhotos: string[];
  };
  assignment: {
    serviceTlName: string | null;
    serviceTlAssignedAt: string | null;
    technicianAssignedAt: string;
  };
}

export interface SaveJobCardDetailsRequest {
  initialObservation?: string;
  rootCause?: string;
  workPerformed?: string;
  otherRequirements?: string;
  technicianRemarks?: string;
  labourCharges?: number;
  partsCharges?: number;
  otherCharges?: number;
  totalCharges?: number;
  estimatedCompletionAt?: string;
}

export interface TicketCloseDecisionRequest {
  decision: 'YES' | 'NO';
  remarks?: string;
}

export interface TicketCloseDecisionResponse {
  ticketId: string;
  closed: boolean;
  remarks: string | null;
}

export interface PartSearchResult {
  id: string;
  partCode: string;
  partName: string;
  availableQuantity: number;
  unitOfMeasure: string;
  partCost: string;
}

export type SparePartRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVERSED';

export interface SparePartRequestItem {
  id: string;
  jobCardId: string;
  jobCardNumber: string;
  ticketId: string;
  partId: string;
  partCode: string;
  partName: string;
  availableQuantity: number;
  partCost: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  status: SparePartRequestStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
  reversedById: string | null;
  reversedByName: string | null;
  reversedAt: string | null;
  reversalRemarks: string | null;
}

export interface SparePartRequestListResponse {
  items: SparePartRequestItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateSparePartRequestsPayload {
  items: Array<{ partId: string; requestedQuantity: number }>;
}

export interface ApproveAllSparePartRequestsPayload {
  items?: Array<{ requestId: string; approvedQuantity?: number }>;
}

export interface ApproveAllSparePartRequestsResult {
  approved: SparePartRequestItem[];
  failed: Array<{ requestId: string; partCode: string; reason: string }>;
}

export interface ReturnSparePartsToInventoryPayload {
  items: Array<{ partId: string; returnQuantity: number }>;
}

export interface ReturnSparePartsToInventoryResult {
  items: Array<{ partId: string; partCode: string; returnQuantity: number }>;
  spareParts: JobCardSparePartItem[];
}

export interface UpdateTicketPriorityRequest {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
}

export interface TicketPriorityChangeResponse {
  id: string;
  previousPriority: string;
  newPriority: string;
  reason: string;
  changedByName: string;
  changedByRole: string;
  createdAt: string;
}

export interface TicketPriorityUpdateResponse {
  ticketId: string;
  priority: string;
  change: TicketPriorityChangeResponse;
}

export const ticketService = {
  async getTickets(query: TicketListQuery): Promise<TicketListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<TicketListResponse>>(
      '/api/v1/tickets',
      {
        params: query,
      }
    );
    return unwrapApiData(response);
  },

  async getTicketById(ticketId: string): Promise<TicketDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<TicketDetailResponse>>(
      `/api/v1/tickets/${ticketId}`
    );
    return unwrapApiData(response);
  },

  async createTicket(payload: CreateTicketRequest): Promise<CreateTicketResponse> {
    const response = await apiClient.post<ApiSuccessResponse<CreateTicketResponse>>(
      '/api/v1/tickets',
      payload
    );
    return unwrapApiData(response);
  },

  async createConversationTicket(
    payload: CreateConversationTicketRequest
  ): Promise<CreateTicketResponse> {
    const response = await apiClient.post<ApiSuccessResponse<CreateTicketResponse>>(
      '/api/v1/tickets/conversation',
      payload
    );
    return unwrapApiData(response);
  },

  async assignTechnician(ticketId: string, payload: AssignTechnicianRequest): Promise<void> {
    await apiClient.patch(`/api/v1/tickets/${ticketId}/assign-technician`, payload);
  },

  async updateStatus(ticketId: string, payload: UpdateStatusRequest): Promise<void> {
    await apiClient.patch(`/api/v1/tickets/${ticketId}/status`, payload);
  },

  async updateEta(ticketId: string, payload: UpdateEtaRequest): Promise<void> {
    await apiClient.patch(`/api/v1/tickets/${ticketId}/eta`, payload);
  },

  async updateCharges(ticketId: string, payload: UpdateChargesRequest): Promise<void> {
    await apiClient.patch(`/api/v1/tickets/${ticketId}/charges`, payload);
  },

  async assignServiceTl(
    ticketId: string,
    payload: AssignServiceTlRequest
  ): Promise<TicketWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<TicketWorkflowTransitionResponse>>(
      `/api/v1/tickets/${ticketId}/assign-service-tl`,
      payload
    );
    return unwrapApiData(response);
  },

  async transferServiceTl(
    ticketId: string,
    payload: TransferServiceTlRequest
  ): Promise<TicketWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<TicketWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/transfer-service-tl`,
      payload
    );
    return unwrapApiData(response);
  },

  async resolveConsultation(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<TicketWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<TicketWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/resolve-consultation`,
      payload
    );
    return unwrapApiData(response);
  },

  async requireWorkshop(
    ticketId: string,
    payload: RequireWorkshopRequest
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/require-workshop`,
      payload
    );
    return unwrapApiData(response);
  },

  async markWaitingForParts(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/waiting-for-parts`,
      payload
    );
    return unwrapApiData(response);
  },

  async resumeRepair(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/resume`,
      payload
    );
    return unwrapApiData(response);
  },

  async startRepair(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/start-repair`,
      payload
    );
    return unwrapApiData(response);
  },

  async markJobCardCompleted(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/mark-completed`,
      payload
    );
    return unwrapApiData(response);
  },

  async markReadyForDeployment(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/ready-for-deployment`,
      payload
    );
    return unwrapApiData(response);
  },

  async closeTicketAfterVerification(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest & {
      paymentMode?: string;
      utrNumber?: string;
      amount?: number;
    } = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/close-ticket`,
      payload
    );
    return unwrapApiData(response);
  },

  async returnJobCardForRework(
    ticketId: string,
    payload: TicketWorkflowRemarksRequest = {}
  ): Promise<JobCardWorkflowTransitionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardWorkflowTransitionResponse>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/return-for-rework`,
      payload
    );
    return unwrapApiData(response);
  },

  async listJobCards(): Promise<JobCardListItem[]> {
    const response =
      await apiClient.get<ApiSuccessResponse<JobCardListItem[]>>('/api/v1/job-cards');
    return unwrapApiData(response);
  },

  async getJobCard(jobCardId: string): Promise<JobCardListItem> {
    const response = await apiClient.get<ApiSuccessResponse<JobCardListItem>>(
      `/api/v1/job-cards/${jobCardId}`
    );
    return unwrapApiData(response);
  },

  async getMyServiceTlTickets(query: TicketListQuery): Promise<TicketListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<TicketListResponse>>(
      '/api/v1/service-tl-workspace/tickets',
      { params: query }
    );
    return unwrapApiData(response);
  },

  async getMyServiceTlTicketById(ticketId: string): Promise<TicketDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<TicketDetailResponse>>(
      `/api/v1/service-tl-workspace/tickets/${ticketId}`
    );
    return unwrapApiData(response);
  },

  async getServiceEngineerDashboard(): Promise<ServiceEngineerDashboard> {
    const response = await apiClient.get<ApiSuccessResponse<ServiceEngineerDashboard>>(
      '/api/v1/service-tl-workspace/dashboard'
    );
    return unwrapApiData(response);
  },

  async listPendingClosureRequests(): Promise<TicketClosureRequest[]> {
    const response = await apiClient.get<ApiSuccessResponse<TicketClosureRequest[]>>(
      '/api/v1/service-tl-workspace/closure-requests'
    );
    return unwrapApiData(response);
  },

  async approveClosureRequest(requestId: string, remarks?: string): Promise<TicketClosureRequest> {
    const response = await apiClient.post<ApiSuccessResponse<TicketClosureRequest>>(
      `/api/v1/service-tl-workspace/closure-requests/${requestId}/approve`,
      { remarks }
    );
    return unwrapApiData(response);
  },

  async rejectClosureRequest(requestId: string, remarks: string): Promise<TicketClosureRequest> {
    const response = await apiClient.post<ApiSuccessResponse<TicketClosureRequest>>(
      `/api/v1/service-tl-workspace/closure-requests/${requestId}/reject`,
      { remarks }
    );
    return unwrapApiData(response);
  },

  async getJobCardDetail(ticketId: string): Promise<JobCardDetail> {
    const response = await apiClient.get<ApiSuccessResponse<JobCardDetail>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card`
    );
    return unwrapApiData(response);
  },

  /** Read-only Job Card view for the Tickets module (Coordinator/Admin) - separate route from the Workshop Workspace one above. */
  async getTicketJobCard(ticketId: string): Promise<JobCardDetail> {
    const response = await apiClient.get<ApiSuccessResponse<JobCardDetail>>(
      `/api/v1/tickets/${ticketId}/job-card`
    );
    return unwrapApiData(response);
  },

  async saveJobCardDetails(
    ticketId: string,
    payload: SaveJobCardDetailsRequest
  ): Promise<JobCardDetail> {
    const response = await apiClient.patch<ApiSuccessResponse<JobCardDetail>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card`,
      payload
    );
    return unwrapApiData(response);
  },

  async requestSpareParts(
    ticketId: string,
    payload: CreateSparePartRequestsPayload
  ): Promise<SparePartRequestItem[]> {
    const response = await apiClient.post<ApiSuccessResponse<SparePartRequestItem[]>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`,
      payload
    );
    return unwrapApiData(response);
  },

  async listSparePartRequests(ticketId: string): Promise<SparePartRequestItem[]> {
    const response = await apiClient.get<ApiSuccessResponse<SparePartRequestItem[]>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests`
    );
    return unwrapApiData(response);
  },

  async listAllSparePartRequests(params?: {
    page?: number;
    pageSize?: number;
    status?: SparePartRequestStatus;
    partCode?: string;
  }): Promise<SparePartRequestListResponse> {
    const response = await apiClient.get<ApiSuccessResponse<SparePartRequestListResponse>>(
      '/api/v1/workshop-workspace/job-card/spare-part-requests',
      { params }
    );
    return unwrapApiData(response);
  },

  async approveSparePartRequest(
    requestId: string,
    approvedQuantity?: number
  ): Promise<SparePartRequestItem> {
    const response = await apiClient.post<ApiSuccessResponse<SparePartRequestItem>>(
      `/api/v1/workshop-workspace/job-card/spare-part-requests/${requestId}/approve`,
      approvedQuantity ? { approvedQuantity } : {}
    );
    return unwrapApiData(response);
  },

  async approveAllSparePartRequests(
    ticketId: string,
    payload: ApproveAllSparePartRequestsPayload = {}
  ): Promise<ApproveAllSparePartRequestsResult> {
    const response = await apiClient.post<ApiSuccessResponse<ApproveAllSparePartRequestsResult>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-requests/approve-all`,
      payload
    );
    return unwrapApiData(response);
  },

  async returnSparePartsToInventory(
    ticketId: string,
    payload: ReturnSparePartsToInventoryPayload
  ): Promise<ReturnSparePartsToInventoryResult> {
    const response = await apiClient.post<ApiSuccessResponse<ReturnSparePartsToInventoryResult>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/return`,
      payload
    );
    return unwrapApiData(response);
  },

  /** Return Control Policy (Document 8): staged submit - a Service Engineer must separately approve
   * before inventory or the job card's returnedQuantity actually change. */
  async submitSparePartReturnRequest(
    ticketId: string,
    payload: CreateSparePartReturnRequestPayload
  ): Promise<SparePartReturnRequestItem> {
    const response = await apiClient.post<ApiSuccessResponse<SparePartReturnRequestItem>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-return-requests`,
      payload
    );
    return unwrapApiData(response);
  },

  async listSparePartReturnRequests(ticketId: string): Promise<SparePartReturnRequestItem[]> {
    const response = await apiClient.get<ApiSuccessResponse<SparePartReturnRequestItem[]>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-part-return-requests`
    );
    return unwrapApiData(response);
  },

  /** Consumption Rules (Document 8): recording usage never moves inventory - stock already left
   * Central Inventory at issue time. Returns the updated spare-part row only. */
  async recordConsumedQuantity(
    ticketId: string,
    payload: RecordConsumedQuantityPayload
  ): Promise<JobCardSparePartItem> {
    const response = await apiClient.post<ApiSuccessResponse<JobCardSparePartItem>>(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/spare-parts/consumption`,
      payload
    );
    return unwrapApiData(response);
  },

  async rejectSparePartRequest(requestId: string, remarks: string): Promise<SparePartRequestItem> {
    const response = await apiClient.post<ApiSuccessResponse<SparePartRequestItem>>(
      `/api/v1/workshop-workspace/job-card/spare-part-requests/${requestId}/reject`,
      { remarks }
    );
    return unwrapApiData(response);
  },

  async reverseSparePartRequest(requestId: string, remarks: string): Promise<SparePartRequestItem> {
    const response = await apiClient.post<ApiSuccessResponse<SparePartRequestItem>>(
      `/api/v1/workshop-workspace/job-card/spare-part-requests/${requestId}/reverse`,
      { remarks }
    );
    return unwrapApiData(response);
  },

  async downloadJobCardPdf(ticketId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/api/v1/workshop-workspace/tickets/${ticketId}/job-card/pdf`,
      {
        responseType: 'blob',
      }
    );
    return response.data as Blob;
  },

  async downloadDeliveryNote(ticketId: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/tickets/${ticketId}/delivery-note`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async closeTicketDecision(
    ticketId: string,
    payload: TicketCloseDecisionRequest
  ): Promise<TicketCloseDecisionResponse> {
    const response = await apiClient.post<ApiSuccessResponse<TicketCloseDecisionResponse>>(
      `/api/v1/tickets/${ticketId}/close-decision`,
      payload
    );
    return unwrapApiData(response);
  },

  async searchParts(code: string): Promise<PartSearchResult[]> {
    const response = await apiClient.get<ApiSuccessResponse<PartSearchResult[]>>(
      '/api/v1/job-cards/parts-search',
      { params: { code } }
    );
    return unwrapApiData(response);
  },

  async updateTicketPriority(
    ticketId: string,
    payload: UpdateTicketPriorityRequest
  ): Promise<TicketPriorityUpdateResponse> {
    const response = await apiClient.patch<ApiSuccessResponse<TicketPriorityUpdateResponse>>(
      `/api/v1/tickets/${ticketId}/priority`,
      payload
    );
    return unwrapApiData(response);
  },

  async listTicketPriorityChanges(ticketId: string): Promise<TicketPriorityChangeResponse[]> {
    const response = await apiClient.get<ApiSuccessResponse<TicketPriorityChangeResponse[]>>(
      `/api/v1/tickets/${ticketId}/priority-history`
    );
    return unwrapApiData(response);
  },
};
