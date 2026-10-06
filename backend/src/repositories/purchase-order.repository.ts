import type { Prisma, PrismaClient } from "@prisma/client";
import type { PurchaseOrderListQueryDto } from "../dto/procurement.dto";

const includeRelations = {
  supplier: { select: { name: true } },
  createdBy: { select: { name: true } },
  lines: { include: { part: { select: { partCode: true, partName: true } } } },
  inventoryUploads: {
    select: { id: true, invoiceNumber: true, totalQuantityAdded: true, uploadedAt: true, uploadedBy: { select: { name: true } } },
    orderBy: { uploadedAt: "desc" },
  },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof includeRelations }>;

export class PurchaseOrderRepository {
  constructor(private prisma: PrismaClient) {}

  private buildWhere(query: PurchaseOrderListQueryDto): Prisma.PurchaseOrderWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };
  }

  async list(query: PurchaseOrderListQueryDto): Promise<{ items: PurchaseOrderWithRelations[]; totalRecords: number }> {
    const where = this.buildWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, totalRecords };
  }

  findById(id: string): Promise<PurchaseOrderWithRelations | null> {
    return this.prisma.purchaseOrder.findUnique({ where: { id }, include: includeRelations });
  }

  async findLatestNumberWithPrefix(tx: Prisma.TransactionClient, prefix: string): Promise<string | null> {
    const latest = await tx.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: `${prefix}-` } },
      orderBy: { poNumber: "desc" },
      select: { poNumber: true },
    });
    return latest?.poNumber ?? null;
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.PurchaseOrderCreateInput,
    lines: Omit<Prisma.PurchaseOrderLineCreateManyInput, "purchaseOrderId">[]
  ) {
    return tx.purchaseOrder.create({
      data: {
        ...data,
        lines: { create: lines },
      },
      include: includeRelations,
    });
  }

  /** Draft-only: replaces every line wholesale (delete + recreate), simplest correct approach for
   * an editor that lets the Service Engineer freely add/remove/edit lines before issuing. */
  async replaceLines(
    tx: Prisma.TransactionClient,
    purchaseOrderId: string,
    lines: Omit<Prisma.PurchaseOrderLineCreateManyInput, "purchaseOrderId">[],
    totalValue: Prisma.Decimal.Value
  ) {
    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId } });
    return tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        totalValue,
        lines: { create: lines },
      },
      include: includeRelations,
    });
  }

  updateStatus(id: string, data: Prisma.PurchaseOrderUpdateInput) {
    return this.prisma.purchaseOrder.update({ where: { id }, data, include: includeRelations });
  }

  updateStatusInTransaction(tx: Prisma.TransactionClient, id: string, data: Prisma.PurchaseOrderUpdateInput) {
    return tx.purchaseOrder.update({ where: { id }, data, include: includeRelations });
  }

  incrementLineReceivedQuantity(tx: Prisma.TransactionClient, lineId: string, receivedQuantity: number) {
    return tx.purchaseOrderLine.update({
      where: { id: lineId },
      data: { receivedQuantity: { increment: receivedQuantity } },
    });
  }

  findLineById(tx: Prisma.TransactionClient, id: string) {
    return tx.purchaseOrderLine.findUnique({ where: { id } });
  }
}
