import type { CustomerSearchItem, CustomerVehicleResponse } from '@/services/customerService';
import type { CreateTicketResponse } from '@/services/ticketService';
import type { IssueCategoryLookupResponse } from '@/services/lookupService';
import type { RideabilityStatus } from '@mspl/shared-constants';

export type { RideabilityStatus } from '@mspl/shared-constants';

export type ConversationIssueGroup = {
  categoryId: string;
  categoryName: string;
  subcategory: string;
};

export type ConversationValidationState = {
  riderSearch: string;
  issueCollection: string;
  photos: string;
  submission: string;
};

export type ConversationMetadata = {
  channel: 'WEB';
  startedAt: string;
};

export type SubmissionStatus = 'IDLE' | 'SUBMITTING' | 'SUCCEEDED' | 'FAILED';

export type ConversationPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export type TicketConversationState = {
  currentStep: number;
  query: string;
  searchResults: CustomerSearchItem[];
  selectedRider: CustomerSearchItem | null;
  deploymentVehicles: CustomerVehicleResponse[];
  selectedVehicle: CustomerVehicleResponse | null;
  rideability: RideabilityStatus | null;
  issueCategories: IssueCategoryLookupResponse[];
  selectedCategory: IssueCategoryLookupResponse | null;
  subcategories: string[];
  selectedSubcategory: string | null;
  issueGroups: ConversationIssueGroup[];
  remarks: string;
  photos: ConversationPhoto[];
  metadata: ConversationMetadata;
  validation: ConversationValidationState;
  isSearching: boolean;
  isIssueLoading: boolean;
  submissionStatus: SubmissionStatus;
  createdTicket: CreateTicketResponse | null;
};
