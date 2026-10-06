import type { Prisma, PrismaClient } from "@prisma/client";
import type { PartsInventoryUploadListQueryDto } from "../dto/parts.dto";

type PartsInventoryUploadPrisma = PrismaClient | Prisma.TransactionClient;

export interface CreatePartsInventoryUploadInput {
  fileName: string;
  fileContent: Buffer | null;
  fileSizeBytes: number;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  partsCreated: number;
  partsUpdated: number;
  totalQuantityAdded: number;
  totalValue: number;
  /** The MMPL supplier invoice this stock physically arrived against - required on every upload;
   * this is what lets Inventory Upload double as the receipt record instead of a separate GRN. */
  invoiceNumber: string;
  /** Set when this upload is receiving against a specific issued Purchase Order. */
  purchaseOrderId?: string | null;
  uploadedById: string;
}

const listSelect = {
  id: true,
  fileName: true,
  fileSizeBytes: true,
  totalRows: true,
  successfulRows: true,
  failedRows: true,
  partsCreated: true,
  partsUpdated: true,
  totalQuantityAdded: true,
  totalValue: true,
  invoiceNumber: true,
  purchaseOrderId: true,
  purchaseOrder: { select: { poNumber: true } },
  uploadedById: true,
  uploadedAt: true,
  uploadedBy: { select: { name: true } },
} satisfies Prisma.PartsInventoryUploadSelect;

export type PartsInventoryUploadListRow = Prisma.PartsInventoryUploadGetPayload<{ select: typeof listSelect }>;

export class PartsInventoryUploadRepository {
  constructor(private readonly prisma: PartsInventoryUploadPrisma) {}

  create(input: CreatePartsInventoryUploadInput) {
    return this.prisma.partsInventoryUpload.create({ data: input });
  }

  private buildWhere(query: PartsInventoryUploadListQueryDto): Prisma.PartsInventoryUploadWhereInput {
    if (!query.dateFrom && !query.dateTo) return {};
    return {
      uploadedAt: {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      },
    };
  }

  async list(query: PartsInventoryUploadListQueryDto): Promise<{ items: PartsInventoryUploadListRow[]; totalRecords: number }> {
    const where = this.buildWhere(query);
    const [items, totalRecords] = await Promise.all([
      this.prisma.partsInventoryUpload.findMany({
        where,
        select: listSelect,
        orderBy: { uploadedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.partsInventoryUpload.count({ where }),
    ]);
    return { items, totalRecords };
  }

  findContent(id: string) {
    return this.prisma.partsInventoryUpload.findUnique({
      where: { id },
      select: { fileName: true, fileContent: true },
    });
  }
}
