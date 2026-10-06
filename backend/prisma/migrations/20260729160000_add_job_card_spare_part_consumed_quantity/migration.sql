-- Technician Workspace (Document 8): records how much of the issued quantity was actually
-- consumed during repair. Never moves inventory - stock already left Central Inventory at issue
-- time. Used by Job Card closure reconciliation (requiredQuantity = consumedQuantity + returnedQuantity).
ALTER TABLE "JobCardSparePart" ADD COLUMN "consumedQuantity" INTEGER NOT NULL DEFAULT 0;
