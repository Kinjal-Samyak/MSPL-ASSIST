import type { CreateTicketDto } from "../../dto/ticket.dto";
import type { ConversationContextData } from "../conversation-context";
import type { SelectedIssue } from "../conversation-context";
import { ApplicationError } from "../../errors";
import { logger } from "../../utils/logger";

/**
 * ConversationTicketMapper converts conversation context to ticket DTO.
 *
 * Responsibilities:
 * ✓ Map conversation data to CreateTicketDto
 * ✓ Extract issue category and description from selectedIssues
 * ✓ Collect photo references
 * ✓ Include deployment information
 * ✓ Set default values (source, priority)
 *
 * Must NOT:
 * ✗ Validate input (handler validates)
 * ✗ Call services or repositories
 * ✗ Perform business logic
 * ✗ Access Prisma
 *
 * Pure mapping only.
 */
export class ConversationTicketMapper {
  /**
   * Convert ConversationContextData to CreateTicketDto.
   *
   * Maps:
   * - registeredMobile → From registeredCustomer.mobile
   * - issueCategoryId → From first selectedIssue
   * - issueDescription → From first selectedIssue.description
   * - photoUrls → From all selectedIssues photos (joined)
   * - mvTrackNumber → From deployment metadata (if available)
   * - vehicleNumber → From deployment info
   * - source → Default: WHATSAPP
   * - priority → Default: MEDIUM
   * - sendUpdate → Default: true
   *
   * @param contextData - Conversation context with all collected data
   * @returns CreateTicketDto ready for TicketService
   * @throws ApplicationError if mapping fails
   */
  static mapToCreateTicketDto(contextData: ConversationContextData): CreateTicketDto {
    try {
      // Extract registered mobile
      const registeredMobile = contextData.registeredCustomer?.mobile;
      if (!registeredMobile) {
        throw new ApplicationError("Registered mobile not found in context");
      }

      // Extract first issue (primary issue for ticket)
      const selectedIssues = contextData.selectedIssues;
      if (!selectedIssues || selectedIssues.length === 0) {
        throw new ApplicationError("No issues found in context");
      }

      const primaryIssue: SelectedIssue = selectedIssues[0];
      if (!primaryIssue.issueCategoryId || !primaryIssue.description) {
        throw new ApplicationError("Primary issue missing ID or description");
      }

      // Collect all photos from all issues (comma-separated)
      const allPhotos = this.collectPhotosFromIssues(selectedIssues);

      // Map to DTO
      const dto: CreateTicketDto = {
        registeredMobile,
        issueCategoryId: primaryIssue.issueCategoryId,
        issueDescription: primaryIssue.description,
        // Default values (required by TicketService validation)
        source: "WHATSAPP",
        priority: "MEDIUM",
        sendUpdate: true,
      };

      // Include vehicle information if available
      if (contextData.activeDeployment) {
        // storageDeploymentId is the mvTrackNumber equivalent in our schema
        dto.mvTrackNumber = contextData.activeDeployment.deploymentId;
        dto.vehicleNumber = contextData.activeDeployment.vehicleNumber;
      }

      // Include photos if collected
      if (allPhotos) {
        dto.coordinatorNotes = `Photos: ${allPhotos}`;
      }

      logger.info({
        service: "ConversationTicketMapper",
        action: "mapToCreateTicketDto",
        event: "MAPPING_SUCCESS",
        registeredMobile: registeredMobile.substring(0, 4) + "****" + registeredMobile.substring(8),
        issueCategoryId: primaryIssue.issueCategoryId,
        issueCount: selectedIssues.length,
        photoCount: selectedIssues.reduce((sum, issue) => sum + (issue.photoUrls?.length ?? 0), 0),
      });

      return dto;
    } catch (error) {
      logger.error({
        service: "ConversationTicketMapper",
        action: "mapToCreateTicketDto",
        event: "MAPPING_FAILED",
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Collect all photo URLs from all selected issues.
   *
   * Joins photos from multiple issues with commas for coordinator reference.
   * Photos are stored as placeholder references (e.g., PHOTO_001, PHOTO_002).
   *
   * @param selectedIssues - Array of issues with photos
   * @returns Comma-separated photo references or empty string
   */
  private static collectPhotosFromIssues(selectedIssues: SelectedIssue[]): string {
    const allPhotos: string[] = [];

    for (const issue of selectedIssues) {
      if (issue.photoUrls && Array.isArray(issue.photoUrls)) {
        allPhotos.push(...issue.photoUrls);
      }
    }

    return allPhotos.join(", ");
  }
}
