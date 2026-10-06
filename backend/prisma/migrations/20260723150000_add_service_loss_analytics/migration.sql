ALTER TABLE "VehicleModel"
  ADD COLUMN "slaTargetDays" INTEGER NOT NULL DEFAULT 3;

CREATE TABLE "VehicleModelRate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicleModelId" UUID NOT NULL,
    "weeklyRental" DECIMAL(12,2) NOT NULL,
    "dailyRental" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModelRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleModelRate_vehicleModelId_effectiveFrom_idx" ON "VehicleModelRate"("vehicleModelId", "effectiveFrom");

ALTER TABLE "VehicleModelRate"
  ADD CONSTRAINT "VehicleModelRate_vehicleModelId_fkey"
  FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket"
  ADD COLUMN "rfdAt" TIMESTAMP(3),
  ADD COLUMN "serviceLossDailyRental" DECIMAL(12,2),
  ADD COLUMN "serviceLossAmount" DECIMAL(12,2),
  ADD COLUMN "serviceLossFrozenAt" TIMESTAMP(3);
