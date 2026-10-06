import { NotFoundError, UnprocessableEntityError } from "../errors";
import { prismaClient } from "../database";
import type {
  PartsInventoryUploadListQueryDto,
  PartsInventoryUploadListResponseDto,
  PartsInventoryUploadResponseDto,
} from "../dto/parts.dto";
import { PartsInventoryUploadRepository, type PartsInventoryUploadListRow } from "../repositories/parts-inventory-upload.repository";

export class PartsInventoryUploadService {
  constructor(private readonly repository = new PartsInventoryUploadRepository(prismaClient)) {}

  async list(query: PartsInventoryUploadListQueryDto): Promise<PartsInventoryUploadListResponseDto> {
    const { items, totalRecords } = await this.repository.list(query);
    return {
      items: items.map((row) => PartsInventoryUploadService.toDto(row)),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getDownload(id: string): Promise<{ fileName: string; content: Buffer }> {
    const row = await this.repository.findContent(id);
    if (!row) throw new NotFoundError("Upload history record was not found.");
    if (!row.fileContent) throw new UnprocessableEntityError("The original file for this upload is no longer available.");
    return { fileName: row.fileName, content: Buffer.from(row.fileContent) };
  }

  private static toDto(row: PartsInventoryUploadListRow): PartsInventoryUploadResponseDto {
    return {
      id: row.id,
      fileName: row.fileName,
      fileSizeBytes: row.fileSizeBytes,
      totalRows: row.totalRows,
      successfulRows: row.successfulRows,
      failedRows: row.failedRows,
      partsCreated: row.partsCreated,
      partsUpdated: row.partsUpdated,
      totalQuantityAdded: row.totalQuantityAdded,
      totalValue: row.totalValue.toString(),
      invoiceNumber: row.invoiceNumber,
      purchaseOrderId: row.purchaseOrderId,
      poNumber: row.purchaseOrder?.poNumber ?? null,
      uploadedById: row.uploadedById,
      uploadedByName: row.uploadedBy.name,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }
}
