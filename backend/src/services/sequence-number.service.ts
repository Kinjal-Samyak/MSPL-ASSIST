import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { ApplicationError } from "../errors";
import { logger } from "../utils/logger";

/**
 * Generalizes the advisory-lock + date-prefix + zero-padded-sequence pattern proven in
 * TicketNumberService (ticket-number.service.ts) into a reusable helper for any other
 * "PREFIX-DDMMYY-###" number - used by ProcurementRequest/PurchaseOrder numbering.
 * TicketNumberService itself is untouched; ticket numbers keep their own lock key.
 */
export const SEQUENCE_LOCK_KEYS = {
  PROCUREMENT_REQUEST: 1337002001,
  PURCHASE_ORDER: 1337002002,
} as const;

export interface SequenceNumberConfig {
  /** Distinct advisory-lock key per number type - see SEQUENCE_LOCK_KEYS. Must not collide with
   * TicketNumberService.LOCK_KEY (1337001337) or another entity's key. */
  lockKey: number;
  /** e.g. "PR", "PO", "GRN". */
  entityPrefix: string;
  sequenceDigits: number;
  maxSequence: number;
  /** Finds the most recent number already sharing this run's date prefix, or null if none exist
   * yet today - typically `findFirst({ where: { field: { startsWith: prefix } }, orderBy: { field: "desc" } })`. */
  findLatestNumber: (tx: Prisma.TransactionClient, prefix: string) => Promise<string | null>;
}

export class SequenceNumberService {
  static async generateNextNumber(tx: Prisma.TransactionClient, config: SequenceNumberConfig, generatedAt: Date = new Date()): Promise<string> {
    const prefix = SequenceNumberService.formatDatePrefix(config.entityPrefix, generatedAt);

    logger.info({
      service: "SequenceNumberService",
      action: "generateNextNumber",
      event: "start",
      prefix,
      generatedAt: generatedAt.toISOString(),
    });

    try {
      await tx.$executeRaw(PrismaNamespace.sql`SELECT pg_advisory_xact_lock(${config.lockKey})`);

      const latestNumber = await config.findLatestNumber(tx, prefix);
      const sequence = SequenceNumberService.calculateNextSequence(latestNumber, prefix, config.sequenceDigits, config.maxSequence);
      const number = SequenceNumberService.buildNumber(prefix, sequence, config.sequenceDigits);

      logger.info({
        service: "SequenceNumberService",
        action: "generateNextNumber",
        event: "success",
        number,
        sequence,
        prefix,
      });

      return number;
    } catch (error) {
      logger.error({
        service: "SequenceNumberService",
        action: "generateNextNumber",
        event: "failure",
        prefix,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to generate the next number.", 500, { prefix, cause: error });
    }
  }

  public static formatDatePrefix(entityPrefix: string, value: Date): string {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = String(value.getFullYear()).slice(-2);

    return `${entityPrefix}-${day}${month}${year}`;
  }

  public static parseSequenceFromNumber(value: string, prefix: string): number | null {
    if (!value.startsWith(`${prefix}-`)) {
      return null;
    }

    const suffix = value.slice(prefix.length + 1);
    const parsed = Number(suffix);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }

  public static calculateNextSequence(latestNumber: string | null | undefined, prefix: string, sequenceDigits: number, maxSequence: number): number {
    if (!latestNumber) {
      return 1;
    }

    const currentSequence = SequenceNumberService.parseSequenceFromNumber(latestNumber, prefix);
    const nextSequence = currentSequence !== null ? currentSequence + 1 : 1;

    if (nextSequence > maxSequence) {
      throw new ApplicationError(`Number sequence overflow for ${prefix}. Maximum daily sequence of ${maxSequence} has been reached.`, 500, {
        prefix,
        currentSequence,
      });
    }

    return nextSequence;
  }

  public static buildNumber(prefix: string, sequence: number, sequenceDigits: number): string {
    return `${prefix}-${String(sequence).padStart(sequenceDigits, "0")}`;
  }
}
