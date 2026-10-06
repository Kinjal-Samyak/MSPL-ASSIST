export type TicketClosureRequestType = "CANCELLATION" | "EARLY_CLOSURE";
export type TicketClosureReasonCategory = "ACCOUNT_CLOSURE" | "VEHICLE_EXCHANGE" | "VEHICLE_UPGRADE" | "OTHER";
export type TicketClosureRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CreateTicketClosureRequestDto {
  requestType: TicketClosureRequestType;
  reasonCategory?: TicketClosureReasonCategory;
  reason: string;
  paymentWaived: boolean;
  paymentWaiveRemarks?: string;
  paymentMode?: "NEFT" | "UPI";
  paymentUtrNumber?: string;
  paymentAmount?: number;
}

export interface DecideTicketClosureRequestDto {
  decision: "APPROVED" | "REJECTED";
  remarks?: string;
}

export interface TicketClosureRequestResponseDto {
  id: string;
  ticketId: string;
  ticketNumber: string;
  requestType: TicketClosureRequestType;
  reasonCategory: TicketClosureReasonCategory | null;
  reason: string;
  paymentWaived: boolean;
  paymentWaiveRemarks: string | null;
  paymentMode: string | null;
  paymentUtrNumber: string | null;
  paymentAmount: string | null;
  status: TicketClosureRequestStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
}
