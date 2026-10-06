-- Append-only inventory ledger (Enterprise Inventory Ledger, phase 1: schema + wiring only)
CREATE TYPE "PartTransactionType" AS ENUM ('RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'WARRANTY_RETURN', 'SCRAP');

CREATE TABLE "PartInventoryTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partId" UUID NOT NULL,
    "transactionType" "PartTransactionType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "hubId" UUID,
    "vehicleModelId" UUID,
    "technicianId" UUID,
    "jobCardId" UUID,
    "ticketId" UUID,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "unitCost" DECIMAL(12,2),
    "reason" TEXT,
    "performedById" UUID NOT NULL,
    "transactionMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartInventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartInventoryTransaction_partId_createdAt_idx" ON "PartInventoryTransaction"("partId", "createdAt");
CREATE INDEX "PartInventoryTransaction_transactionType_idx" ON "PartInventoryTransaction"("transactionType");
CREATE INDEX "PartInventoryTransaction_hubId_idx" ON "PartInventoryTransaction"("hubId");
CREATE INDEX "PartInventoryTransaction_technicianId_idx" ON "PartInventoryTransaction"("technicianId");
CREATE INDEX "PartInventoryTransaction_vehicleModelId_idx" ON "PartInventoryTransaction"("vehicleModelId");
CREATE INDEX "PartInventoryTransaction_jobCardId_idx" ON "PartInventoryTransaction"("jobCardId");
CREATE INDEX "PartInventoryTransaction_transactionMonth_idx" ON "PartInventoryTransaction"("transactionMonth");

ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartInventoryTransaction" ADD CONSTRAINT "PartInventoryTransaction_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
