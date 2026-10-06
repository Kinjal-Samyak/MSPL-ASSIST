import type { Prisma, PrismaClient, PartTransactionType } from "@prisma/client";
import { toTransactionMonth } from "../utils/part-inventory-transaction";
import type { ConsumptionGroupBy, PartInventoryTransactionListQueryDto } from "../dto/parts.dto";

type PartInventoryTransactionPrisma = PrismaClient | Prisma.TransactionClient;

const GROUP_BY_COLUMN: Record<ConsumptionGroupBy, "transactionMonth" | "hubId" | "vehicleModelId" | "technicianId" | "partId" | "jobCardId"> = {
  MONTH: "transactionMonth",
  HUB: "hubId",
  VEHICLE_MODEL: "vehicleModelId",
  TECHNICIAN: "technicianId",
  PART: "partId",
  JOB_CARD: "jobCardId",
};

const transactionListInclude = {
  part: { select: { partCode: true, partName: true } },
  hub: { select: { name: true } },
  vehicleModel: { select: { displayName: true } },
  technician: { select: { name: true } },
  jobCard: { select: { jobCardNumber: true } },
  ticket: { select: { ticketNumber: true } },
  performedBy: { select: { name: true } },
} satisfies Prisma.PartInventoryTransactionInclude;

export type PartInventoryTransactionRow = Prisma.PartInventoryTransactionGetPayload<{ include: typeof transactionListInclude }>;

export interface RecordPartInventoryTransactionInput {
  partId: string;
  transactionType: PartTransactionType;
  quantityDelta: number;
  balanceAfter: number;
  hubId?: string | null;
  vehicleModelId?: string | null;
  technicianId?: string | null;
  jobCardId?: string | null;
  ticketId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  unitCost?: number | string | null;
  reason?: string | null;
  performedById: string;
}

/** Append-only writes only - this table has no update/delete methods by design (see schema comment
 * on PartInventoryTransaction). Accepts a transaction client so callers can write a ledger row inside
 * whatever transaction already deducted/restored Part.availableQuantity, keeping both atomic. */
export class PartInventoryTransactionRepository {
  constructor(private readonly prisma: PartInventoryTransactionPrisma) {}

  record(input: RecordPartInventoryTransactionInput) {
    const unitCost = input.unitCost == null ? null : Number(input.unitCost);
    const totalValue = unitCost == null ? null : Number((input.quantityDelta * unitCost).toFixed(2));
    return this.prisma.partInventoryTransaction.create({
      data: { ...input, totalValue, transactionMonth: toTransactionMonth(new Date()) },
    });
  }

  private buildWhere(query: PartInventoryTransactionListQueryDto): Prisma.PartInventoryTransactionWhereInput {
    return {
      ...(query.partId ? { partId: query.partId } : {}),
      ...(query.transactionType ? { transactionType: query.transactionType } : {}),
      ...(query.hubId ? { hubId: query.hubId } : {}),
      ...(query.technicianId ? { technicianId: query.technicianId } : {}),
      ...(query.jobCardId ? { jobCardId: query.jobCardId } : {}),
      ...(query.dateFrom || query.dateTo
        ? { createdAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } }
        : {}),
    };
  }

  async listTransactions(query: PartInventoryTransactionListQueryDto): Promise<{ items: PartInventoryTransactionRow[]; totalRecords: number }> {
    const where = this.buildWhere(query);
    const [items, totalRecords] = await Promise.all([
      this.prisma.partInventoryTransaction.findMany({
        where,
        include: transactionListInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.partInventoryTransaction.count({ where }),
    ]);
    return { items, totalRecords };
  }

  /** Net consumption only (ISSUE minus RETURN) - RECEIPT/ADJUSTMENT never count as "consumed". Summed
   * server-side via groupBy rather than a raw SQL date-trunc, per this codebase's report.repository.ts
   * convention (groupBy + separate name lookup in the service layer, not $queryRaw). */
  async getConsumptionSummary(
    groupBy: ConsumptionGroupBy,
    filters: { dateFrom?: string; dateTo?: string; hubId?: string }
  ): Promise<Array<{ key: string | null; quantity: number; value: number }>> {
    const column = GROUP_BY_COLUMN[groupBy];
    const where: Prisma.PartInventoryTransactionWhereInput = {
      transactionType: { in: ["ISSUE", "RETURN"] },
      ...(filters.hubId ? { hubId: filters.hubId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? { createdAt: { ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}), ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}) } }
        : {}),
    };

    const rows = await this.prisma.partInventoryTransaction.groupBy({
      by: [column],
      where,
      _sum: { quantityDelta: true, totalValue: true },
    });

    return rows.map((row) => ({
      key: (row as Record<string, unknown>)[column] as string | null,
      quantity: -(row._sum.quantityDelta ?? 0),
      value: -(Number(row._sum.totalValue ?? 0)),
    }));
  }
}
