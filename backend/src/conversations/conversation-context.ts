/**
 * Represents a selected issue with ID, display name, description, and optional photos.
 * 
 * Each issue can accumulate a description and multiple photo references as the conversation progresses.
 * This aligns with the database model (Ticket has multiple TicketIssueItem records,
 * each with description and optional photo URLs).
 */
export interface SelectedIssue {
  /**
   * Issue category unique identifier (UUID).
   */
  issueCategoryId: string;

  /**
   * Issue category display name (e.g., "Battery", "Charging Issue").
   */
  issueCategoryName: string;

  /**
   * Detailed description of this specific issue.
   * Optional until customer provides it in WAITING_ISSUE_DESCRIPTION state.
   * Each issue maintains its own description.
   */
  description?: string;

  /**
   * Array of photo references/URLs for this specific issue.
   * Contains placeholders like PHOTO_001, PHOTO_002, etc.
   * In this milestone, no actual images are downloaded or stored;
   * these are just text references that represent media placeholders.
   * Actual image processing will be implemented in a future milestone.
   * Each issue can have zero or more photos.
   */
  photoUrls?: string[];
}

/**
 * Represents a customer after mobile number registration.
 * 
 * Created when customer provides registered mobile number.
 * Customer verification (lookup, KYC, etc.) happens in subsequent states.
 * This structure is extensible for future customer attributes.
 */
export interface RegisteredCustomer {
  /**
   * Normalized 10-digit mobile number (country code and trunk prefix removed).
   */
  mobile: string;

  /**
   * Customer ID after successful lookup/verification.
   * Optional until customer verification milestone.
   */
  customerId?: string;

  /**
   * Customer display name for reference.
   * Optional until customer verification milestone.
   */
  customerName?: string;

  /**
   * Whether customer has been verified against master data.
   * Initially false after mobile collection.
   * Set to true in VERIFYING_CUSTOMER state.
   */
  verified: boolean;
}

/**
 * Represents an active deployment/rental vehicle verified for the customer.
 *
 * Created when an active deployment is found during VERIFYING_DEPLOYMENT state.
 * Contains all vehicle and hub information needed for ticket creation.
 * This structure prevents need for database lookups during ticket creation.
 */
export interface VerifiedDeployment {
  /**
   * Deployment unique identifier (UUID).
   */
  deploymentId: string;

  /**
   * Vehicle unique identifier (UUID).
   */
  vehicleId: string;

  /**
   * Vehicle number (license plate).
   */
  vehicleNumber: string;

  /**
   * Vehicle model display name (e.g., "Ather 450X").
   */
  vehicleModel: string;

  /**
   * Hub unique identifier (UUID).
   */
  hubId: string;

  /**
   * Hub display name (e.g., "Bangalore - HSR Layout").
   */
  hubName: string;

  /**
   * Current rental status (e.g., "ACTIVE", "MAINTENANCE").
   */
  rentalStatus: string;

  /**
   * Rental start date (ISO format).
   */
  startDate?: string;
}

/**
 * Strongly typed conversation context data structure.
 *
 * This interface defines the schema for conversationData JSON field.
 * All fields are optional to allow incremental building during conversation flow.
 *
 * Fields are populated as the customer progresses through the conversation:
 * - selectedIssues: Added when customer selects issue category
 * - issueDescription: Added when customer provides description
 * - photoUrl: Added if customer uploads photo (or skips)
 * - registeredCustomer: Added when customer provides mobile number
 * - activeDeployment: Added when deployment is verified
 * - ticketId: Added after ticket creation
 */
export interface ConversationContextData {
  /**
   * List of issues selected by customer, each with ID, display name, and optional description.
   * Prevents need for database lookups during confirmation/summary screens.
   * Names are captured at selection time to protect against future category name changes.
   * Descriptions are added progressively as customer provides them.
   */
  selectedIssues?: SelectedIssue[];

  /**
   * URL of photo uploaded by customer, or explicit SKIP marker.
   */
  photoUrl?: string;

  /**
   * Registered customer with mobile number and verification status.
   * Initially populated with just mobile and verified=false.
   * Extended with customerId and customerName after verification.
   */
  registeredCustomer?: RegisteredCustomer;

  /**
   * Active deployment/rental vehicle verified for customer.
   * Added after successful deployment verification.
   * Contains all vehicle information needed for ticket creation.
   */
  activeDeployment?: VerifiedDeployment;

  /**
   * Ticket ID after successful ticket creation.
   */
  ticketId?: string;

  /**
   * Ticket details after successful ticket creation.
   * Contains ticketId, ticketNumber, status, and creation timestamp.
   * Prevents need for database lookups during confirmation screen.
   */
  ticket?: {
    ticketId: string;
    ticketNumber: string;
    status: string;
    createdAt: string;
  };

  /**
   * Metadata for future extensibility (e.g., timestamps, retry counts).
   */
  metadata?: Record<string, unknown>;
}

export function createEmptyContext(): ConversationContextData {
  return {};
}

export function isValidContext(data: unknown): data is ConversationContextData {
  if (data === null || data === undefined) {
    return true;
  }
  return typeof data === "object";
}
