-- Additive columns supporting: editable-quantity approval audit trail, and partial
-- return-to-inventory tracking for approved spare parts.

ALTER TABLE "JobCardSparePartRequest" ADD COLUMN "approvedQuantity" INTEGER;

ALTER TABLE "JobCardSparePart" ADD COLUMN "returnedQuantity" INTEGER NOT NULL DEFAULT 0;
