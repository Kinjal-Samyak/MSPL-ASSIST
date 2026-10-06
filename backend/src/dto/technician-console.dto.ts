export interface TechnicianJobListQueryDto {
  page: number;
  pageSize: number;
  search?: string;
}

export interface TechnicianJobDto {
  id: string;
  ticketNumber: string;
  mvTrackNumber: string | null;
  riderName: string;
  vehicleModel: string | null;
  registrationNumber: string | null;
  complaintSummary: string;
  priority: string;
  assignedAt: string | null;
  currentMilestone: string;
  slaDueAt: string | null;
  workflowStage: string;
  jobCardStage: "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" | "RFD" | null;
}

export interface TechnicianJobListDto {
  items: TechnicianJobDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TechnicianDashboardDto {
  assignedJobs: number;
  jobsInProgress: number;
  waitingForParts: number;
  completedToday: number;
  averageRepairTimeHours: number;
  slaCompliancePercent: number;
  overdueJobs: number;
  jobCardStageCounts: {
    IN_PROGRESS: number;
    WAITING_PARTS: number;
    COMPLETED: number;
    RFD: number;
  };
}

export interface TechnicianJobDetailDto extends TechnicianJobDto {
  asset: {
    mvTrackNumber: string | null;
    vehicleModel: string | null;
    registrationNumber: string | null;
    hub: string | null;
    deploymentStatus: string | null;
    currentRider: string | null;
  };
  complaint: {
    issueCategory: string;
    description: string;
    riderRemarks: string | null;
    coordinatorNotes: string | null;
  };
  parts: { available: false; message: string };
}

export interface TechnicianInspectionInputDto {
  initialFindings: string;
  observations?: string;
  rootCause?: string;
  repairRecommendation?: string;
}

export interface TechnicianRepairNoteInputDto {
  findings?: string;
  rootCause?: string;
  repairPerformed?: string;
  recommendations?: string;
}

export interface TechnicianPhotoInputDto {
  photoType: "BEFORE_REPAIR" | "DURING_REPAIR" | "AFTER_REPAIR" | "DAMAGED_COMPONENT";
  reference: string;
}

export interface TechnicianTimelineItemDto {
  id: string;
  action: string;
  remarks: string | null;
  createdAt: string;
  technicianName: string;
}
