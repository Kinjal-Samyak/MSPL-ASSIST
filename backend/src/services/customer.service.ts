import { prismaClient } from "../database";
import { MasterRepository } from "../repositories/master.repository";
import type { Customer } from "@prisma/client";
import { ApplicationError } from "../errors";
import { logger } from "../utils/logger";
import { LogEvent } from "../shared/log-event";

/**
 * CustomerService provides customer-related business logic.
 *
 * Responsibilities:
 * - Customer lookup by registered mobile
 * - Customer data validation
 * - Business rule enforcement
 *
 * Handlers communicate only with CustomerService, never directly with repositories.
 * This maintains the Service Layer pattern and encapsulates business logic.
 */
export class CustomerService {
  private readonly repository: MasterRepository;

  constructor(repository?: MasterRepository) {
    this.repository = repository ?? new MasterRepository(prismaClient);
  }

  /**
   * Finds a customer by their registered mobile number.
   *
   * This is the primary method used by conversation handlers to verify customer identity.
   *
   * @param registeredMobile - The 10-digit mobile number (already normalized by caller)
   * @returns Customer if found, null if not found
   * @throws ApplicationError if database access fails
   */
  async findByRegisteredMobile(registeredMobile: string): Promise<Customer | null> {
    if (!registeredMobile || typeof registeredMobile !== "string") {
      logger.error({
        service: "CustomerService",
        action: "findByRegisteredMobile",
        event: LogEvent.OPERATION_FAILED,
        reason: "Invalid mobile number parameter",
      });

      throw new ApplicationError("Invalid mobile number provided");
    }

    try {
      logger.info({
        service: "CustomerService",
        action: "findByRegisteredMobile",
        event: "CUSTOMER_LOOKUP_STARTED",
      });

      const customer = await this.repository.findCustomerByRegisteredMobile(registeredMobile);

      if (customer) {
        logger.info({
          service: "CustomerService",
          action: "findByRegisteredMobile",
          event: LogEvent.CUSTOMER_LOOKUP_SUCCESS,
          customerId: customer.id,
          customerName: customer.name,
        });
      } else {
        logger.info({
          service: "CustomerService",
          action: "findByRegisteredMobile",
          event: LogEvent.CUSTOMER_LOOKUP_FAILED,
          reason: "Customer not found",
        });
      }

      return customer;
    } catch (error) {
      logger.error({
        service: "CustomerService",
        action: "findByRegisteredMobile",
        event: LogEvent.OPERATION_FAILED,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Customer lookup failed");
    }
  }
}
