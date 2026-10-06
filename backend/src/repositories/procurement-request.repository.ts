import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProcurementRequestListQueryDto } from "../dto/procurement.dto";

const includeRelations = {
  part: { select: { partCode: true, partName: true } },
  jobCard: { select: { jobCardNumber: true } },
  requestedBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
} satisfies Prisma.ProcurementRequestInclude;

export type ProcurementRequestWithRelations = Prisma.ProcurementRequestGetPayload<{ include: typeof includeRelations }>;

export class ProcurementRequestRepository {
  constructor(private prisma: PrismaClient) {}

  private buildWhere(query: ProcurementRequestListQueryDto): Prisma.ProcurementRequestWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.partId ? { partId: query.partId } : {}),
    };
  }

  async list(query: ProcurementRequestListQueryDto): Promise<{ items: ProcurementRequestWithRelations[]; totalRecords: number }> {
    const where = this.buildWhere(query);
    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.procurementRequest.findMany({
        where,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.procurementRequest.count({ where }),
    ]);
    return { items, totalRecords };
  }

  findById(id: string): Promise<ProcurementRequestWithRelations | null> {
    return this.prisma.procurementRequest.findUnique({ where: { id }, include: includeRelations });
  }

  async findLatestNumberWithPrefix(tx: Prisma.TransactionClient, prefix: string): Promise<string | null> {
    const latest = await tx.procurementRequest.findFirst({
      where: { requestNumber: { startsWith: `${prefix}-` } },
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    });
    return latest?.requestNumber ?? null;
  }

  create(tx: Prisma.TransactionClient, data: Prisma.ProcurementRequestCreateInput) {
    return tx.procurementRequest.create({ data, include: includeRelations });
  }

  updateStatus(id: string, data: Prisma.ProcurementRequestUpdateInput) {
    return this.prisma.procurementRequest.update({ where: { id }, data, include: includeRelations });
  }
}
