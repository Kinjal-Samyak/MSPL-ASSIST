-- Procurement domain: Supplier -> ProcurementRequest -> PurchaseOrder(+Lines) -> GoodsReceiptNote(+Lines).
-- Purely additive - no existing table/column is altered.

-- CreateEnum
CREATE TYPE "ProcurementRequestReason" AS ENUM ('LOW_STOCK', 'JOB_CARD_SHORTAGE', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProcurementRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO', 'CLOSED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementRequest" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "partId" UUID NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "reason" "ProcurementRequestReason" NOT NULL DEFAULT 'MANUAL',
    "status" "ProcurementRequestStatus" NOT NULL DEFAULT 'PENDING',
    "jobCardId" UUID,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdById" UUID NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "procurementRequestId" UUID,
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptNote" (
    "id" UUID NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "receivedById" UUID NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceiptNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptNoteLine" (
    "id" UUID NOT NULL,
    "goodsReceiptNoteId" UUID NOT NULL,
    "purchaseOrderLineId" UUID NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "GoodsReceiptNoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierCode_key" ON "Supplier"("supplierCode");

-- CreateIndex
CREATE INDEX "Supplier_active_idx" ON "Supplier"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementRequest_requestNumber_key" ON "ProcurementRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ProcurementRequest_partId_idx" ON "ProcurementRequest"("partId");

-- CreateIndex
CREATE INDEX "ProcurementRequest_status_idx" ON "ProcurementRequest"("status");

-- CreateIndex
CREATE INDEX "ProcurementRequest_jobCardId_idx" ON "ProcurementRequest"("jobCardId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_partId_idx" ON "PurchaseOrderLine"("partId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_procurementRequestId_idx" ON "PurchaseOrderLine"("procurementRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceiptNote_grnNumber_key" ON "GoodsReceiptNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_purchaseOrderId_idx" ON "GoodsReceiptNote"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "GoodsReceiptNote_status_idx" ON "GoodsReceiptNote"("status");

-- CreateIndex
CREATE INDEX "GoodsReceiptNoteLine_goodsReceiptNoteId_idx" ON "GoodsReceiptNoteLine"("goodsReceiptNoteId");

-- CreateIndex
CREATE INDEX "GoodsReceiptNoteLine_purchaseOrderLineId_idx" ON "GoodsReceiptNoteLine"("purchaseOrderLineId");

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "ProcurementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNote" ADD CONSTRAINT "GoodsReceiptNote_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNoteLine" ADD CONSTRAINT "GoodsReceiptNoteLine_goodsReceiptNoteId_fkey" FOREIGN KEY ("goodsReceiptNoteId") REFERENCES "GoodsReceiptNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNoteLine" ADD CONSTRAINT "GoodsReceiptNoteLine_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
