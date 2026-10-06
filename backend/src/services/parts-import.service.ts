import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { PARTS_TEMPLATE_HEADERS, PARTS_TEMPLATE_VERSION, PartsImportEngine, type PartsImportPreview, type PartsImportTemplateType } from "../parts-import/parts-import.engine";
import { PartsRepository } from "../repositories/parts.repository";
import { PartInventoryTransactionRepository } from "../repositories/part-inventory-transaction.repository";
import { PartsInventoryUploadRepository } from "../repositories/parts-inventory-upload.repository";
import { PurchaseOrderRepository } from "../repositories/purchase-order.repository";
import { prismaClient } from "../database";
import { ConflictError, NotFoundError, UnprocessableEntityError } from "../errors";
import type { CreatePartDto } from "../dto/parts.dto";

export class PartsImportService {
  private readonly engine = new PartsImportEngine(); private readonly sessions = new Map<string, PartsImportPreview>();
  /** The raw uploaded workbook only lives here (not in `sessions`, which is returned to the client as
   * JSON) between preview and confirm, so a downloadable copy can be persisted to PartsInventoryUpload
   * once the import is actually confirmed. */
  private readonly rawInventoryUploads = new Map<string, { fileName: string; buffer: Buffer }>();
  constructor(
    private readonly repository = new PartsRepository(prismaClient),
    private readonly uploadRepository = new PartsInventoryUploadRepository(prismaClient),
    private readonly purchaseOrders = new PurchaseOrderRepository(prismaClient)
  ) {}
  async getTemplates() {
    return Promise.all(
      (["CATALOG", "INVENTORY"] as const).map(async (type) => ({
        type,
        templateVersion: PARTS_TEMPLATE_VERSION,
        headers: PARTS_TEMPLATE_HEADERS[type],
        fileName: type === "CATALOG" ? "parts-master-import-v1.xlsx" : "parts-inventory-import-v1.xlsx",
        workbookBase64: await this.createTemplate(type),
      }))
    );
  }
  /** Styled header row (black fill, bold white text) with column filters, matching the approved import format exactly. INVENTORY ships with no sample row so it matches the real invoice layout precisely. */
  private async createTemplate(type: PartsImportTemplateType): Promise<string> {
    const headers = PARTS_TEMPLATE_HEADERS[type];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory");

    sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(12, header.length + 4) }));
    if (type === "CATALOG") {
      sheet.addRow(["PART-001", "Sample Part", "", "Electrical", "", "M7", "M7", "EA", 0, "No", "No", 0, 0, "", "Yes", "", PARTS_TEMPLATE_VERSION]);
    }

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle" };
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const readMeSheet = workbook.addWorksheet("Read Me");
    readMeSheet.addRow(["Parts Import Template", "Version", PARTS_TEMPLATE_VERSION]);
    readMeSheet.addRow(["Enter data only in the Inventory sheet. Do not rename headers."]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer).toString("base64");
  }
  async previewCatalog(workbookBase64: string): Promise<PartsImportPreview> {
    const preview = this.engine.preview(Buffer.from(workbookBase64, "base64"), "CATALOG");
    if (!preview.errors.length) for (const [index, row] of preview.rows.entries()) { const rowNumber = index + 2; if (!await this.repository.findCategoryByName(String(row["Part Category"]))) preview.errors.push({ rowNumber, column: "Part Category", reason: "Active Part Category was not found." }); const modelCode = String(row["Model Code"] ?? "").trim(); if (modelCode && !await this.repository.findVehicleModelByCode(modelCode)) preview.errors.push({ rowNumber, column: "Model Code", reason: "Active Vehicle Model was not found." }); }
    const invalidRows = new Set(preview.errors.filter((error) => error.rowNumber > 1).map((error) => error.rowNumber)); preview.invalidRecords = invalidRows.size; preview.validRecords = preview.totalRecords - invalidRows.size; this.sessions.set(preview.sessionId, preview); return preview;
  }
  async confirmCatalog(sessionId: string) {
    const preview = this.sessions.get(sessionId); if (!preview || preview.templateType !== "CATALOG") throw new NotFoundError("Import preview session was not found or has expired.");
    let inserted = 0; let updated = 0; const failedRows = [...preview.errors]; const invalid = new Set(preview.errors.filter((error) => error.rowNumber > 1).map((error) => error.rowNumber));
    for (const [index, row] of preview.rows.entries()) { const rowNumber = index + 2; if (invalid.has(rowNumber)) continue; try { await prismaClient.$transaction(async (tx) => { const repository = new PartsRepository(tx); const category = await repository.findCategoryByName(String(row["Part Category"])); if (!category) throw new Error("Active Part Category was not found."); const payload = this.rowToPart(row, category.id); const existing = await repository.findPartByCode(payload.partCode); if (existing) { await repository.updatePart(existing.id, payload); updated += 1; } else { await repository.createPart(payload); inserted += 1; } }); } catch (error) { failedRows.push({ rowNumber, column: "Part Code", reason: error instanceof Error ? error.message : "Catalogue row could not be persisted." }); } }
    this.sessions.delete(sessionId); return { sessionId, totalRows: preview.totalRecords, successfulRows: inserted + updated, failedRows: failedRows.length, newPartsCreated: inserted, existingPartsUpdated: updated, warnings: preview.warnings, errors: failedRows, processingDurationMs: 0 };
  }
  /** Inventory import is self-sufficient - a Part Code unknown to the Catalog is flagged as a warning (not an error) and auto-created on confirm, so a single Inventory upload is enough. */
  async previewInventory(workbookBase64: string, fileName: string): Promise<PartsImportPreview> {
    const buffer = Buffer.from(workbookBase64, "base64");
    const preview = this.engine.preview(buffer, "INVENTORY");
    this.rawInventoryUploads.set(preview.sessionId, { fileName, buffer });
    if (!preview.errors.length) {
      const seen = new Set<string>();
      for (const [index, row] of preview.rows.entries()) {
        const rowNumber = index + 2;
        const partCode = String(row["Part Code"] ?? "").trim().toUpperCase();
        if (partCode && !seen.has(partCode)) {
          seen.add(partCode);
          if (!(await this.repository.findPartByCode(partCode))) {
            preview.warnings.push({ rowNumber, column: "Part Code", reason: "Not yet in the Parts Catalog - will be created automatically on confirm." });
          }
        }
      }
    }
    const invalidRows = new Set(preview.errors.filter((error) => error.rowNumber > 1).map((error) => error.rowNumber)); preview.invalidRecords = invalidRows.size; preview.validRecords = preview.totalRecords - invalidRows.size; this.sessions.set(preview.sessionId, preview); return preview;
  }
  /**
   * Inventory Upload is the sole receipt mechanism (no separate Goods Receipt module) -
   * invoiceNumber is required on every confirm since it's what makes this record double as the
   * MMPL receipt document. purchaseOrderId is optional: when the Service Engineer is receiving against
   * a Purchase Order they raised, tagging it here increments that PO's matching lines and
   * recomputes its status (RECEIVED / PARTIALLY_RECEIVED) - the same status machine a GRN
   * confirmation used to drive.
   */
  async confirmInventory(sessionId: string, performedById: string, invoiceNumber: string, purchaseOrderId?: string) {
    const preview = this.sessions.get(sessionId); if (!preview || preview.templateType !== "INVENTORY") throw new NotFoundError("Import preview session was not found or has expired.");
    if (!invoiceNumber.trim()) throw new UnprocessableEntityError("An invoice number is required to confirm this upload.");

    let purchaseOrder: Awaited<ReturnType<PurchaseOrderRepository["findById"]>> = null;
    if (purchaseOrderId) {
      purchaseOrder = await this.purchaseOrders.findById(purchaseOrderId);
      if (!purchaseOrder) throw new NotFoundError(`Purchase order ${purchaseOrderId} was not found.`);
      if (purchaseOrder.status !== "ISSUED" && purchaseOrder.status !== "PARTIALLY_RECEIVED") {
        throw new ConflictError(`Purchase order ${purchaseOrder.poNumber} must be ISSUED or PARTIALLY_RECEIVED to receive against it (currently ${purchaseOrder.status}).`);
      }
    }

    const failedRows = [...preview.errors]; const invalid = new Set(preview.errors.filter((error) => error.rowNumber > 1).map((error) => error.rowNumber));
    /** Parts are managed centrally, so repeated Part Codes across invoice rows are summed into one running total per part before persisting. First-seen Part Name/Rate are used if the part needs to be auto-created. */
    const totalsByPartCode = new Map<string, { quantity: number; partName: string; rate: number }>();
    preview.rows.forEach((row, index) => {
      const rowNumber = index + 2; if (invalid.has(rowNumber)) return;
      const partCode = String(row["Part Code"] ?? "").trim().toUpperCase();
      const quantity = Number(row.Quantity) || 0;
      const existing = totalsByPartCode.get(partCode);
      if (existing) existing.quantity += quantity;
      else totalsByPartCode.set(partCode, { quantity, partName: String(row["Part Name"] ?? "").trim(), rate: Number(row.Rate) || 0 });
    });
    let partsCreated = 0; let partsUpdated = 0; let totalQuantityAdded = 0; let totalValue = 0;
    /** partId keyed by partCode, captured for every part actually persisted this run - used below to
     * match against Purchase Order lines by partId (the PO doesn't know about part codes). */
    const receivedPartIds = new Map<string, { partId: string; quantity: number }>();
    /** Wrapped per part-code (not the whole batch) so one bad row still fails independently and the
     * rest of the upload succeeds - matches confirmCatalog's per-row transaction below. Each part's
     * stock increment and its RECEIPT ledger row are written atomically together. */
    for (const [partCode, entry] of totalsByPartCode) {
      try {
        await prismaClient.$transaction(async (tx) => {
          const repository = new PartsRepository(tx);
          if (!(await repository.findPartByCode(partCode))) {
            const category = await repository.findOrCreateGeneralCategory();
            await repository.createPart({ partCode, partName: entry.partName || partCode, categoryId: category.id, unitOfMeasure: "EA", partCost: entry.rate, warrantyEligible: false, consumable: false, minimumStock: 0, reorderLevel: 0, active: true, compatibleModels: [] });
            partsCreated += 1;
          }
          const part = await repository.incrementAvailableQuantity(partCode, entry.quantity);
          await new PartInventoryTransactionRepository(tx).record({
            partId: part.id,
            transactionType: "RECEIPT",
            quantityDelta: entry.quantity,
            balanceAfter: part.availableQuantity,
            referenceType: purchaseOrderId ? "PURCHASE_ORDER" : "INVENTORY_IMPORT",
            referenceId: purchaseOrderId ?? sessionId,
            unitCost: part.partCost.toString(),
            reason: `Invoice ${invoiceNumber}`,
            performedById,
          });
          receivedPartIds.set(partCode, { partId: part.id, quantity: entry.quantity });
        });
        partsUpdated += 1; totalQuantityAdded += entry.quantity; totalValue += entry.quantity * entry.rate;
      } catch (error) { failedRows.push({ rowNumber: 0, column: "Part Code", reason: `${partCode}: ${error instanceof Error ? error.message : "Could not update available quantity."}` }); }
    }

    const rawUpload = this.rawInventoryUploads.get(sessionId);
    await this.uploadRepository.create({
      fileName: rawUpload?.fileName ?? `${sessionId}.xlsx`,
      fileContent: rawUpload?.buffer ?? null,
      fileSizeBytes: rawUpload?.buffer.length ?? 0,
      totalRows: preview.totalRecords,
      successfulRows: preview.totalRecords - invalid.size,
      failedRows: failedRows.length,
      partsCreated,
      partsUpdated,
      totalQuantityAdded,
      totalValue: Number(totalValue.toFixed(2)),
      invoiceNumber: invoiceNumber.trim(),
      purchaseOrderId: purchaseOrderId ?? null,
      uploadedById: performedById,
    });

    if (purchaseOrder) {
      await this.applyReceiptToPurchaseOrder(purchaseOrder, receivedPartIds);
    }

    this.sessions.delete(sessionId); this.rawInventoryUploads.delete(sessionId);
    return { sessionId, totalRows: preview.totalRecords, successfulRows: preview.totalRecords - invalid.size, failedRows: failedRows.length, partsCreated, partsUpdated, totalQuantityAdded, warnings: preview.warnings, errors: failedRows, processingDurationMs: 0 };
  }

  /** For every part this upload actually received, increments the matching (by partId) Purchase
   * Order line's receivedQuantity, capped at what remains outstanding on that line - a part not on
   * the PO, or already fully received, is simply skipped (this upload can legitimately contain
   * parts unrelated to this PO). Recomputes the PO's status once every line has been checked. */
  private async applyReceiptToPurchaseOrder(
    purchaseOrder: NonNullable<Awaited<ReturnType<PurchaseOrderRepository["findById"]>>>,
    receivedPartIds: Map<string, { partId: string; quantity: number }>
  ): Promise<void> {
    const receivedByPartId = new Map(Array.from(receivedPartIds.values()).map((entry) => [entry.partId, entry.quantity]));

    await prismaClient.$transaction(async (tx) => {
      for (const line of purchaseOrder.lines) {
        const receivedQuantity = receivedByPartId.get(line.partId);
        if (!receivedQuantity) continue;
        const remaining = line.orderedQuantity - line.receivedQuantity;
        if (remaining <= 0) continue;
        const increment = Math.min(receivedQuantity, remaining);
        await this.purchaseOrders.incrementLineReceivedQuantity(tx, line.id, increment);
      }

      const refreshedLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: purchaseOrder.id } });
      const fullyReceived = refreshedLines.every((line) => line.receivedQuantity >= line.orderedQuantity);
      await this.purchaseOrders.updateStatusInTransaction(tx, purchaseOrder.id, { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" });
    });
  }
  private rowToPart(row: Record<string, unknown>, categoryId: string): CreatePartDto { const yes = (field: string) => String(row[field]).trim().toUpperCase() === "YES" || String(row[field]).trim().toUpperCase() === "TRUE"; const integer = (field: string) => { const value = String(row[field] ?? "").trim(); return value ? Number(value) : undefined; }; return { partCode: String(row["Part Code"]).trim().toUpperCase(), partName: String(row["Part Name"]).trim(), description: String(row.Description ?? "").trim() || undefined, categoryId, unitOfMeasure: String(row.Unit).trim(), partCost: Number(row["Part Cost"]), warrantyEligible: yes("Warranty Eligible"), consumable: yes("Consumable"), minimumStock: integer("Minimum Stock") ?? 0, reorderLevel: integer("Reorder Level") ?? 0, maximumStock: integer("Maximum Stock"), active: yes("Active"), remarks: String(row.Remarks ?? "").trim() || undefined, compatibleModels: String(row["Model Code"] ?? "").trim() ? [{ modelCode: String(row["Model Code"]).trim(), modelName: String(row["Model Name"] ?? row["Model Code"]).trim() }] : [] }; }
}
