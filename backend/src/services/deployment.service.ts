import type { VerifiedDeployment } from "../conversations/conversation-context";
import { ApplicationError } from "../errors";
import { logger } from "../utils/logger";
import { LogEvent } from "../shared/log-event";
import { OperationalProviders, type OperationalProvidersRegistry } from "./operational-providers";

/**
 * DeploymentService provides deployment/vehicle verification logic.
 *
 * Responsibilities:
 * - Find active deployments for customers
 * - Map deployment data to conversation structures
 * - Business rule enforcement (only active deployments)
 *
 * Handlers communicate only with DeploymentService, never directly with repositories.
 * This maintains the Service Layer pattern and encapsulates business logic.
 */
export class DeploymentService {
  constructor(private readonly providers: OperationalProvidersRegistry = OperationalProviders) {}

  /**
   * Finds the active deployment for a customer.
   *
   * This is the primary method used by conversation handlers to verify
   * that a customer has an active rental/deployment.
   *
   * A deployment is considered active if its rentalStatus is ACTIVE or PENDING.
   *
   * @param customerId - The customer UUID
   * @returns VerifiedDeployment if found, null if not found
   * @throws ApplicationError if database access fails
   */
  async getActiveDeployment(customerId: string): Promise<VerifiedDeployment | null> {
    if (!customerId || typeof customerId !== "string") {
      logger.error({
        service: "DeploymentService",
        action: "getActiveDeployment",
        event: LogEvent.OPERATION_FAILED,
        reason: "Invalid customer ID parameter",
      });

      throw new ApplicationError("Invalid customer ID provided");
    }

    try {
      logger.info({
        service: "DeploymentService",
        action: "getActiveDeployment",
        event: "DEPLOYMENT_LOOKUP_STARTED",
        customerId,
      });

      const deployment = await this.providers.deploymentProvider.getActiveDeployment(customerId);

      if (deployment) {
        const verified = this.mapToVerifiedDeployment(deployment);

        logger.info({
          service: "DeploymentService",
          action: "getActiveDeployment",
          event: LogEvent.DEPLOYMENT_LOOKUP_SUCCESS,
          customerId,
          deploymentId: deployment.deploymentId,
          vehicleNumber: deployment.vehicleNumber,
        });

        return verified;
      } else {
        logger.info({
          service: "DeploymentService",
          action: "getActiveDeployment",
          event: LogEvent.DEPLOYMENT_LOOKUP_FAILED,
          customerId,
          reason: "No active deployment found",
        });
      }

      return null;
    } catch (error) {
      logger.error({
        service: "DeploymentService",
        action: "getActiveDeployment",
        event: LogEvent.OPERATION_FAILED,
        customerId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Deployment lookup failed");
    }
  }

  /**
   * Maps deployment database record to VerifiedDeployment structure.
   *
   * Transforms raw database entity to conversation-friendly structure
   * that contains only fields needed for ticket creation.
   *
   * @param deployment Raw deployment record from database
   * @returns VerifiedDeployment with formatted data
   */
  private mapToVerifiedDeployment(deployment: {
    deploymentId: string;
    vehicleNumber: string;
    modelName: string;
    hubId: string;
    hubName: string;
    rentalStatus: string;
    startedAt: string;
  }): VerifiedDeployment {
    return {
      deploymentId: deployment.deploymentId,
      vehicleId: deployment.deploymentId,
      vehicleNumber: deployment.vehicleNumber,
      vehicleModel: deployment.modelName,
      hubId: deployment.hubId,
      hubName: deployment.hubName,
      rentalStatus: deployment.rentalStatus,
      startDate: deployment.startedAt.split("T")[0],
    };
  }
}
