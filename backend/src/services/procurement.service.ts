import { Prisma } from "@prisma/client";
import { prismaClient } from "../database";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { ProcurementRequestRepository, type ProcurementRequestWithRelations } from "../repositories/procurement-request.repository";
import { PurchaseOrderRepository, type PurchaseOrderWithRelations } from "../repositories/purchase-order.repository";
import { SupplierRepository } from "../repositories/supplier.repository";
import { SEQUENCE_LOCK_KEYS, SequenceNumberService } from "./sequence-number.service";
import { PurchaseOrderPdfService } from "./purchase-order-pdf.service";
import { AuditLogService } from "./audit-log.service";
import type { AdminActorContext } from "./admin.service";
import {
  validateCreateProcurementRequestInput,
  validateCreatePurchaseOrderInput,
  validateCreateSupplierInput,
  validateDecideProcurementRequestInput,
  validateProcurementRequestListQuery,
  validatePurchaseOrderListQuery,
  validateSupplierListQuery,
  validateUpdatePurchaseOrderInput,
  validateUpdateSupplierInput,
} from "../validators/procurement.validator";
import type {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderLineInput,
  ProcurementRequestDto,
  ProcurementRequestListResponseDto,
  PurchaseOrderDto,
  PurchaseOrderListResponseDto,
  SupplierDto,
  SupplierListResponseDto,
} from "../dto/procurement.dto";

const REQUEST_NUMBER_DIGITS = 3;
const REQUEST_NUMBER_MAX = 999;

function toSupplierDto(supplier: {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SupplierDto {
  return {
    id: supplier.id,
    supplierCode: supplier.supplierCode,
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    gstNumber: supplier.gstNumber,
    active: supplier.active,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

function toProcurementRequestDto(row: ProcurementRequestWithRelations): ProcurementRequestDto {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    partId: row.partId,
    partCode: row.part.partCode,
    partName: row.part.partName,
    requestedQuantity: row.requestedQuantity,
    reason: row.reason,
    status: row.status,
    jobCardId: row.jobCardId,
    jobCardNumber: row.jobCard?.jobCardNumber ?? null,
    requestedById: row.requestedById,
    requestedByName: row.requestedBy.name,
    approvedById: row.approvedById,
    approvedByName: row.approvedBy?.name ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPurchaseOrderDto(row: PurchaseOrderWithRelations): PurchaseOrderDto {
  return {
    id: row.id,
    poNumber: row.poNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    status: row.status,
    totalValue: row.totalValue.toString(),
    createdById: row.createdById,
    createdByName: row.createdBy.name,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    expectedDeliveryDate: row.expectedDeliveryDate?.toISOString() ?? null,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    lines: row.lines.map((line) => ({
      id: line.id,
      partId: line.partId,
      partCode: line.part.partCode,
      partName: line.part.partName,
      procurementRequestId: line.procurementRequestId,
      orderedQuantity: line.orderedQuantity,
      receivedQuantity: line.receivedQuantity,
      unitCost: line.unitCost.toString(),
      lineTotal: line.lineTotal.toString(),
    })),
    receipts: row.inventoryUploads.map((upload) => ({
      uploadId: upload.id,
      invoiceNumber: upload.invoiceNumber,
      totalQuantityAdded: upload.totalQuantityAdded,
      uploadedByName: upload.uploadedBy.name,
      uploadedAt: upload.uploadedAt.toISOString(),
    })),
  };
}

function computeLineTotals(lines: CreatePurchaseOrderLineInput[]): { data: Omit<Prisma.PurchaseOrderLineCreateManyInput, "purchaseOrderId">[]; totalValue: number } {
  let totalValue = 0;
  const data = lines.map((line) => {
    const lineTotal = Number((line.orderedQuantity * line.unitCost).toFixed(2));
    totalValue += lineTotal;
    return {
      partId: line.partId,
      procurementRequestId: line.procurementRequestId ?? null,
      orderedQuantity: line.orderedQuantity,
      unitCost: line.unitCost,
      lineTotal,
    };
  });
  return { data, totalValue: Number(totalValue.toFixed(2)) };
}

export class ProcurementService {
  private readonly suppliers: SupplierRepository;
  private readonly requests: ProcurementRequestRepository;
  private readonly purchaseOrders: PurchaseOrderRepository;
  private readonly pdf: PurchaseOrderPdfService;
  private readonly auditLog: AuditLogService;

  constructor(
    suppliers?: SupplierRepository,
    requests?: ProcurementRequestRepository,
    purchaseOrders?: PurchaseOrderRepository,
    pdf?: PurchaseOrderPdfService,
    auditLog?: AuditLogService
  ) {
    this.suppliers = suppliers ?? new SupplierRepository(prismaClient);
    this.requests = requests ?? new ProcurementRequestRepository(prismaClient);
    this.purchaseOrders = purchaseOrders ?? new PurchaseOrderRepository(prismaClient);
    this.pdf = pdf ?? new PurchaseOrderPdfService();
    this.auditLog = auditLog ?? new AuditLogService();
  }

  private async audit(entityType: string, entityId: string, action: string, actor: AdminActorContext | undefined, metadata?: Record<string, unknown>) {
    await this.auditLog.record({
      entityType,
      entityId,
      action,
      performedById: actor?.userId,
      performedByName: actor?.name,
      performedByRole: actor?.role,
      metadata,
    });
  }

  // ---------- Suppliers ----------

  async listSuppliers(queryInput: unknown): Promise<SupplierListResponseDto> {
    const query = validateSupplierListQuery(queryInput);
    const { items, totalRecords } = await this.suppliers.list(query);
    return {
      items: items.map(toSupplierDto),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.pageSize),
    };
  }

  async createSupplier(bodyInput: unknown, actor?: AdminActorContext): Promise<SupplierDto> {
    const input = validateCreateSupplierInput(bodyInput);
    const existing = await this.suppliers.findByCode(input.supplierCode);
    if (existing) {
      throw new ConflictError(`A supplier with code "${input.supplierCode}" already exists.`);
    }
    const created = await this.suppliers.create(input);
    await this.audit("Supplier", created.id, "SUPPLIER_CREATED", actor);
    return toSupplierDto(created);
  }

  async updateSupplier(idInput: unknown, bodyInput: unknown, actor?: AdminActorContext): Promise<SupplierDto> {
    const id = this.requireId(idInput, "supplierId");
    const input = validateUpdateSupplierInput(bodyInput);
    await this.assertSupplierExists(id);
    const updated = await this.suppliers.update(id, input);
    await this.audit("Supplier", id, "SUPPLIER_UPDATED", actor);
    return toSupplierDto(updated);
  }

  // ---------- Procurement Requests ----------

  async listProcurementRequests(queryInput: unknown): Promise<ProcurementRequestListResponseDto> {
    const query = validateProcurementRequestListQuery(queryInput);
    const { items, totalRecords } = await this.requests.list(query);
    return {
      items: items.map(toProcurementRequestDto),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.pageSize),
    };
  }

  async createProcurementRequest(bodyInput: unknown, actor: AdminActorContext | undefined): Promise<ProcurementRequestDto> {
    const input = validateCreateProcurementRequestInput(bodyInput);
    if (!actor?.userId) {
      throw new ValidationError("An authenticated user is required to raise a procurement request.");
    }

    const part = await prismaClient.part.findUnique({ where: { id: input.partId }, select: { id: true } });
    if (!part) {
      throw new NotFoundError(`Part ${input.partId} was not found.`);
    }
    if (input.jobCardId) {
      const jobCard = await prismaClient.jobCard.findUnique({ where: { id: input.jobCardId }, select: { id: true } });
      if (!jobCard) {
        throw new NotFoundError(`Job card ${input.jobCardId} was not found.`);
      }
    }

    const created = await prismaClient.$transaction(async (tx) => {
      const requestNumber = await SequenceNumberService.generateNextNumber(tx, {
        lockKey: SEQUENCE_LOCK_KEYS.PROCUREMENT_REQUEST,
        entityPrefix: "PR",
        sequenceDigits: REQUEST_NUMBER_DIGITS,
        maxSequence: REQUEST_NUMBER_MAX,
        findLatestNumber: (client, prefix) => this.requests.findLatestNumberWithPrefix(client, prefix),
      });

      return this.requests.create(tx, {
        requestNumber,
        part: { connect: { id: input.partId } },
        requestedQuantity: input.requestedQuantity,
        reason: input.reason ?? (input.jobCardId ? "JOB_CARD_SHORTAGE" : "MANUAL"),
        jobCard: input.jobCardId ? { connect: { id: input.jobCardId } } : undefined,
        requestedBy: { connect: { id: actor.userId } },
        remarks: input.remarks,
      });
    });

    await this.audit("ProcurementRequest", created.id, "PROCUREMENT_REQUEST_CREATED", actor, { requestNumber: created.requestNumber });
    return toProcurementRequestDto(created);
  }

  async decideProcurementRequest(
    idInput: unknown,
    decision: "APPROVED" | "REJECTED",
    bodyInput: unknown,
    actor: AdminActorContext | undefined
  ): Promise<ProcurementRequestDto> {
    const id = this.requireId(idInput, "requestId");
    const input = validateDecideProcurementRequestInput(bodyInput);
    if (!actor?.userId) {
      throw new ValidationError("An authenticated user is required to decide a procurement request.");
    }

    const existing = await this.requests.findById(id);
    if (!existing) {
      throw new NotFoundError(`Procurement request ${id} was not found.`);
    }
    if (existing.status !== "PENDING") {
      throw new ConflictError(`Procurement request ${existing.requestNumber} has already been decided (${existing.status}).`);
    }

    const updated = await this.requests.updateStatus(id, {
      status: decision,
      approvedBy: { connect: { id: actor.userId } },
      decidedAt: new Date(),
      remarks: input.remarks ?? existing.remarks,
    });

    await this.audit("ProcurementRequest", id, `PROCUREMENT_REQUEST_${decision}`, actor);
    return toProcurementRequestDto(updated);
  }

  // ---------- Purchase Orders ----------

  async listPurchaseOrders(queryInput: unknown): Promise<PurchaseOrderListResponseDto> {
    const query = validatePurchaseOrderListQuery(queryInput);
    const { items, totalRecords } = await this.purchaseOrders.list(query);
    return {
      items: items.map(toPurchaseOrderDto),
      totalRecords,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.pageSize),
    };
  }

  async getPurchaseOrder(idInput: unknown): Promise<PurchaseOrderDto> {
    const po = await this.getPurchaseOrderOrThrow(idInput);
    return toPurchaseOrderDto(po);
  }

  async createPurchaseOrder(bodyInput: unknown, actor: AdminActorContext | undefined): Promise<PurchaseOrderDto> {
    const input = validateCreatePurchaseOrderInput(bodyInput);
    if (!actor?.userId) {
      throw new ValidationError("An authenticated user is required to create a purchase order.");
    }

    const supplier = await this.suppliers.findById(input.supplierId);
    if (!supplier) {
      throw new NotFoundError(`Supplier ${input.supplierId} was not found.`);
    }
    await this.assertPartsExist(input.lines.map((line) => line.partId));

    const { data: lineData, totalValue } = computeLineTotals(input.lines);

    const created = await prismaClient.$transaction(async (tx) => {
      const poNumber = await SequenceNumberService.generateNextNumber(tx, {
        lockKey: SEQUENCE_LOCK_KEYS.PURCHASE_ORDER,
        entityPrefix: "PO",
        sequenceDigits: REQUEST_NUMBER_DIGITS,
        maxSequence: REQUEST_NUMBER_MAX,
        findLatestNumber: (client, prefix) => this.purchaseOrders.findLatestNumberWithPrefix(client, prefix),
      });

      return this.purchaseOrders.create(
        tx,
        {
          poNumber,
          supplier: { connect: { id: input.supplierId } },
          totalValue,
          createdBy: { connect: { id: actor.userId } },
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
          remarks: input.remarks,
        },
        lineData
      );
    });

    if (input.lines.some((line) => line.procurementRequestId)) {
      const requestIds = input.lines.map((line) => line.procurementRequestId).filter((value): value is string => Boolean(value));
      await prismaClient.procurementRequest.updateMany({
        where: { id: { in: requestIds }, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "CONVERTED_TO_PO" },
      });
    }

    await this.audit("PurchaseOrder", created.id, "PURCHASE_ORDER_CREATED", actor, { poNumber: created.poNumber });
    return toPurchaseOrderDto(created);
  }

  async updatePurchaseOrder(idInput: unknown, bodyInput: unknown, actor: AdminActorContext | undefined): Promise<PurchaseOrderDto> {
    const id = this.requireId(idInput, "purchaseOrderId");
    const input = validateUpdatePurchaseOrderInput(bodyInput);
    const existing = await this.getPurchaseOrderOrThrow(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictError(`Purchase order ${existing.poNumber} can only be edited while in DRAFT status.`);
    }

    let updated = existing;
    if (input.lines) {
      await this.assertPartsExist(input.lines.map((line) => line.partId));
      const { data: lineData, totalValue } = computeLineTotals(input.lines);
      updated = await prismaClient.$transaction((tx) => this.purchaseOrders.replaceLines(tx, id, lineData, totalValue));
    }
    if (input.expectedDeliveryDate !== undefined || input.remarks !== undefined) {
      updated = await this.purchaseOrders.updateStatus(id, {
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
        remarks: input.remarks,
      });
    }

    await this.audit("PurchaseOrder", id, "PURCHASE_ORDER_UPDATED", actor);
    return toPurchaseOrderDto(updated);
  }

  async issuePurchaseOrder(idInput: unknown, actor: AdminActorContext | undefined): Promise<PurchaseOrderDto> {
    const id = this.requireId(idInput, "purchaseOrderId");
    const existing = await this.getPurchaseOrderOrThrow(id);
    if (existing.status !== "DRAFT") {
      throw new ConflictError(`Purchase order ${existing.poNumber} has already been issued or cancelled.`);
    }
    if (existing.lines.length === 0) {
      throw new ValidationError("A purchase order needs at least one line before it can be issued.");
    }

    const updated = await this.purchaseOrders.updateStatus(id, { status: "ISSUED", issuedAt: new Date() });
    await this.audit("PurchaseOrder", id, "PURCHASE_ORDER_ISSUED", actor);
    return toPurchaseOrderDto(updated);
  }

  async cancelPurchaseOrder(idInput: unknown, actor: AdminActorContext | undefined): Promise<PurchaseOrderDto> {
    const id = this.requireId(idInput, "purchaseOrderId");
    const existing = await this.getPurchaseOrderOrThrow(id);
    if (existing.status === "RECEIVED" || existing.status === "PARTIALLY_RECEIVED") {
      throw new ConflictError(`Purchase order ${existing.poNumber} has already received goods and cannot be cancelled.`);
    }
    if (existing.status === "CANCELLED") {
      throw new ConflictError(`Purchase order ${existing.poNumber} is already cancelled.`);
    }

    const updated = await this.purchaseOrders.updateStatus(id, { status: "CANCELLED" });
    await this.audit("PurchaseOrder", id, "PURCHASE_ORDER_CANCELLED", actor);
    return toPurchaseOrderDto(updated);
  }

  async renderPurchaseOrderPdf(idInput: unknown): Promise<{ fileName: string; buffer: Buffer }> {
    const po = await this.getPurchaseOrder(idInput);
    const buffer = await this.pdf.render(po);
    return { fileName: `${po.poNumber}.pdf`, buffer };
  }

  // ---------- Shared helpers ----------

  private requireId(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new ValidationError(`${fieldName} is required.`);
    }
    return value.trim();
  }

  private async assertSupplierExists(id: string): Promise<void> {
    const found = await this.suppliers.findById(id);
    if (!found) {
      throw new NotFoundError(`Supplier ${id} was not found.`);
    }
  }

  private async assertPartsExist(partIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(partIds));
    const found = await prismaClient.part.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } });
    if (found.length !== uniqueIds.length) {
      const foundIds = new Set(found.map((part) => part.id));
      const missing = uniqueIds.filter((partId) => !foundIds.has(partId));
      throw new NotFoundError(`Part(s) not found: ${missing.join(", ")}.`);
    }
  }

  private async getPurchaseOrderOrThrow(idInput: unknown): Promise<PurchaseOrderWithRelations> {
    const id = this.requireId(idInput, "purchaseOrderId");
    const po = await this.purchaseOrders.findById(id);
    if (!po) {
      throw new NotFoundError(`Purchase order ${id} was not found.`);
    }
    return po;
  }

}
