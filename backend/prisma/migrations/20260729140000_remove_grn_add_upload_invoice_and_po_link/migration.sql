-- Removes the Goods Receipt Note module (Inventory Upload now does that job - it captures the
-- MMPL invoice number and can optionally receive against a Purchase Order). No production GRN
-- data exists yet, so this is a clean drop, not a data migration.

-- DropForeignKey
ALTER TABLE "GoodsReceiptNote" DROP CONSTRAINT "GoodsReceiptNote_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "GoodsReceiptNote" DROP CONSTRAINT "GoodsReceiptNote_receivedById_fkey";

-- DropForeignKey
ALTER TABLE "GoodsReceiptNoteLine" DROP CONSTRAINT "GoodsReceiptNoteLine_goodsReceiptNoteId_fkey";

-- DropForeignKey
ALTER TABLE "GoodsReceiptNoteLine" DROP CONSTRAINT "GoodsReceiptNoteLine_purchaseOrderLineId_fkey";

-- DropTable
DROP TABLE "GoodsReceiptNote";

-- DropTable
DROP TABLE "GoodsReceiptNoteLine";

-- DropEnum
DROP TYPE "GoodsReceiptStatus";

-- AlterTable: PartsInventoryUpload gains the invoice number (required on every upload) and an
-- optional link to the Purchase Order it's receiving against. Table is empty in every environment
-- so invoiceNumber can be added NOT NULL directly, no backfill needed.
ALTER TABLE "PartsInventoryUpload" ADD COLUMN "invoiceNumber" TEXT NOT NULL,
ADD COLUMN "purchaseOrderId" UUID;

-- CreateIndex
CREATE INDEX "PartsInventoryUpload_purchaseOrderId_idx" ON "PartsInventoryUpload"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "PartsInventoryUpload" ADD CONSTRAINT "PartsInventoryUpload_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
