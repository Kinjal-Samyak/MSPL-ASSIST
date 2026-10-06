import { ConflictError, NotFoundError } from "../errors";
import { prismaClient } from "../database";
import type {
  ConsumptionGroupBy,
  ConsumptionSummaryPointDto,
  ConsumptionSummaryQueryDto,
  CreatePartAdjustmentDto,
  PartAdjustmentResultDto,
  PartInventoryTransactionListQueryDto,
  PartInventoryTransactionListResponseDto,
  PartInventoryTransactionResponseDto,
} from "../dto/parts.dto";
import { PartInventoryTransactionRepository, type PartInventoryTransactionRow } from "../repositories/part-inventory-transaction.repository";

const UNASSIGNED_LABEL: Record<ConsumptionGroupBy, string> = {
  MONTH: "Unknown month",
  HUB: "Unassigned / No Hub",
  VEHICLE_MODEL: "Unassigned / No Vehicle Model",
  TECHNICIAN: "Unassigned / No Technician",
  PART: "Unknown Part",
  JOB_CARD: "Unassigned / No Job Card",
};

export class PartInventoryTransactionService {
  constructor(private readonly repository = new PartInventoryTransactionRepository(prismaClient)) {}

  /** Ledger data only exists from whenever this feature shipped forward - there is no way to
   * reconstruct stock movements that happened before the ledger existed, so this deliberately never
   * backfills or estimates prior history. */
  async createAdjustment(partId: string, actorUserId: string, input: CreatePartAdjustmentDto): Promise<PartAdjustmentResultDto> {
    return prismaClient.$transaction(async (tx) => {
      const part = await tx.part.findUnique({ where: { id: partId }, select: { availableQuantity: true, partCost: true } });
      if (!part) throw new NotFoundError("Part was not found.");

      const nextQuantity = part.availableQuantity + input.quantityDelta;
      if (nextQuantity < 0) {
        throw new ConflictError(`This adjustment would take stock negative: ${part.availableQuantity} available, ${input.quantityDelta} requested.`);
      }

      await tx.part.update({ where: { id: partId }, data: { availableQuantity: nextQuantity } });

      const row = await new PartInventoryTransactionRepository(tx).record({
        partId,
        transactionType: "ADJUSTMENT",
        quantityDelta: input.quantityDelta,
        balanceAfter: nextQuantity,
        hubId: input.hubId ?? null,
        referenceType: "MANUAL_ADJUSTMENT",
        referenceId: null,
        unitCost: part.partCost.toString(),
        reason: input.reason,
        performedById: actorUserId,
      });

      return { partId, availableQuantity: nextQuantity, transactionId: row.id };
    });
  }

  async listTransactions(query: PartInventoryTransactionListQueryDto): Promise<PartInventoryTransactionListResponseDto> {
    const { items, totalRecords } = await this.repository.listTransactions(query);
    return {
      items: items.map((row) => PartInventoryTransactionService.toDto(row)),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getConsumptionSummary(query: ConsumptionSummaryQueryDto): Promise<ConsumptionSummaryPointDto[]> {
    const rows = await this.repository.getConsumptionSummary(query.groupBy, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      hubId: query.hubId,
    });

    const labelMap = await this.resolveLabels(query.groupBy, rows.map((row) => row.key).filter((key): key is string => key != null));

    return rows
      .map((row) => ({
        key: row.key ?? "UNASSIGNED",
        label: row.key == null ? UNASSIGNED_LABEL[query.groupBy] : (labelMap.get(row.key) ?? row.key),
        quantity: row.quantity,
        value: row.value,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  private async resolveLabels(groupBy: ConsumptionGroupBy, keys: string[]): Promise<Map<string, string>> {
    if (groupBy === "MONTH") return new Map(keys.map((key) => [key, key]));
    if (!keys.length) return new Map();

    if (groupBy === "HUB") {
      const rows = await prismaClient.hub.findMany({ where: { id: { in: keys } }, select: { id: true, name: true } });
      return new Map(rows.map((row) => [row.id, row.name]));
    }
    if (groupBy === "VEHICLE_MODEL") {
      const rows = await prismaClient.vehicleModel.findMany({ where: { id: { in: keys } }, select: { id: true, displayName: true } });
      return new Map(rows.map((row) => [row.id, row.displayName]));
    }
    if (groupBy === "TECHNICIAN") {
      const rows = await prismaClient.user.findMany({ where: { id: { in: keys } }, select: { id: true, name: true } });
      return new Map(rows.map((row) => [row.id, row.name]));
    }
    if (groupBy === "PART") {
      const rows = await prismaClient.part.findMany({ where: { id: { in: keys } }, select: { id: true, partCode: true, partName: true } });
      return new Map(rows.map((row) => [row.id, `${row.partCode} - ${row.partName}`]));
    }
    const rows = await prismaClient.jobCard.findMany({ where: { id: { in: keys } }, select: { id: true, jobCardNumber: true } });
    return new Map(rows.map((row) => [row.id, row.jobCardNumber]));
  }

  private static toDto(row: PartInventoryTransactionRow): PartInventoryTransactionResponseDto {
    return {
      id: row.id,
      transactionType: row.transactionType,
      quantityDelta: row.quantityDelta,
      balanceAfter: row.balanceAfter,
      partId: row.partId,
      partCode: row.part.partCode,
      partName: row.part.partName,
      hubId: row.hubId,
      hubName: row.hub?.name ?? null,
      vehicleModelId: row.vehicleModelId,
      vehicleModelName: row.vehicleModel?.displayName ?? null,
      technicianId: row.technicianId,
      technicianName: row.technician?.name ?? null,
      jobCardId: row.jobCardId,
      jobCardNumber: row.jobCard?.jobCardNumber ?? null,
      ticketId: row.ticketId,
      ticketNumber: row.ticket?.ticketNumber ?? null,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      unitCost: row.unitCost?.toString() ?? null,
      totalValue: row.totalValue?.toString() ?? null,
      reason: row.reason,
      performedById: row.performedById,
      performedByName: row.performedBy.name,
      transactionMonth: row.transactionMonth,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
