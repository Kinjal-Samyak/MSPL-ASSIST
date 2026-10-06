-- Stored, signed total value (quantityDelta * unitCost) for cheap value-based ledger aggregation
ALTER TABLE "PartInventoryTransaction" ADD COLUMN "totalValue" DECIMAL(12,2);
