import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { ApplicationError } from "../errors";
import { logger } from "../utils/logger";
import type { TicketNumberDto } from "../dto/ticket.dto";

export class TicketNumberService {
  private static readonly LOCK_KEY = 1337001337;
  private static readonly SEQUENCE_DIGITS = 3;
  private static readonly MAX_SEQUENCE = 999;

  constructor(private prisma: PrismaClient) {}

  async generateNextTicketNumber(tx: Prisma.TransactionClient): Promise<TicketNumberDto> {
    const generatedAt = new Date();
    const prefix = TicketNumberService.formatTicketPrefix(generatedAt);

    logger.info({
      service: "TicketNumberService",
      action: "generateNextTicketNumber",
      event: "start",
      prefix,
      generatedAt: generatedAt.toISOString(),
    });

    try {
      await tx.$executeRaw(PrismaNamespace.sql`SELECT pg_advisory_xact_lock(${TicketNumberService.LOCK_KEY})`);

      const latestTicket = await tx.ticket.findFirst({
        where: {
          ticketNumber: {
            startsWith: `${prefix}-`,
          },
        },
        orderBy: {
          ticketNumber: "desc",
        },
        select: {
          ticketNumber: true,
        },
      });

      const sequence = TicketNumberService.calculateNextSequence(latestTicket?.ticketNumber, prefix);
      const ticketNumber = TicketNumberService.buildTicketNumber(prefix, sequence);

      logger.info({
        service: "TicketNumberService",
        action: "generateNextTicketNumber",
        event: "success",
        ticketNumber,
        sequence,
        prefix,
        generatedAt: generatedAt.toISOString(),
      });

      return {
        ticketNumber,
        prefix,
        sequence,
        generatedAt,
      };
    } catch (error) {
      logger.error({
        service: "TicketNumberService",
        action: "generateNextTicketNumber",
        event: "failure",
        prefix,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ApplicationError("Failed to generate the next ticket number.", 500, {
        prefix,
        cause: error,
      });
    }
  }

  public static formatTicketPrefix(value: Date): string {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = String(value.getFullYear()).slice(-2);

    return `MV-${day}${month}${year}`;
  }

  public static parseSequenceFromTicketNumber(ticketNumber: string, prefix: string): number | null {
    if (!ticketNumber.startsWith(`${prefix}-`)) {
      return null;
    }

    const suffix = ticketNumber.slice(prefix.length + 1);
    const parsed = Number(suffix);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }

  public static calculateNextSequence(latestTicketNumber: string | undefined, prefix: string): number {
    if (!latestTicketNumber) {
      return 1;
    }

    const currentSequence = TicketNumberService.parseSequenceFromTicketNumber(latestTicketNumber, prefix);
    const nextSequence = currentSequence !== null ? currentSequence + 1 : 1;

    if (nextSequence > TicketNumberService.MAX_SEQUENCE) {
      throw new ApplicationError(
        `Ticket number sequence overflow for ${prefix}. Maximum daily sequence of ${TicketNumberService.MAX_SEQUENCE} has been reached.`,
        500,
        { prefix, currentSequence }
      );
    }

    return nextSequence;
  }

  public static buildTicketNumber(prefix: string, sequence: number): string {
    return `${prefix}-${String(sequence).padStart(TicketNumberService.SEQUENCE_DIGITS, "0")}`;
  }
}
