-- Amendment 2 (Version 1.0): Final Spare Part Billing. Ready For Delivery becomes the financial
-- lock point for a Job Card - these columns freeze the consumed-quantity-only billing snapshot at
-- that moment and are never recalculated afterwards.
ALTER TABLE "JobCard" ADD COLUMN     "finalBillingSnapshot" JSONB,
ADD COLUMN     "finalSparePartsAmount" DECIMAL(12,2),
ADD COLUMN     "readyForDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "readyForDeliveryById" UUID;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_readyForDeliveryById_fkey" FOREIGN KEY ("readyForDeliveryById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
