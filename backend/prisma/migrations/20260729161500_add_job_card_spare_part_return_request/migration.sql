-- Technician Workspace (Document 8) Return Control Policy: a Technician's return submission is
-- staged as PENDING until Service TL physically verifies and approves it - approval is the only
-- point inventory actually moves (reuses the existing returnSparePartsToInventory repository
-- logic, this table only adds the approval gate in front of it).

-- CreateEnum
CREATE TYPE "SparePartReturnRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "JobCardSparePartReturnRequest" (
    "id" UUID NOT NULL,
    "jobCardId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "requestedReturnQuantity" INTEGER NOT NULL,
    "approvedReturnQuantity" INTEGER,
    "status" "SparePartReturnRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCardSparePartReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobCardSparePartReturnRequest_jobCardId_idx" ON "JobCardSparePartReturnRequest"("jobCardId");

-- CreateIndex
CREATE INDEX "JobCardSparePartReturnRequest_partId_idx" ON "JobCardSparePartReturnRequest"("partId");

-- CreateIndex
CREATE INDEX "JobCardSparePartReturnRequest_status_idx" ON "JobCardSparePartReturnRequest"("status");

-- AddForeignKey
ALTER TABLE "JobCardSparePartReturnRequest" ADD CONSTRAINT "JobCardSparePartReturnRequest_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardSparePartReturnRequest" ADD CONSTRAINT "JobCardSparePartReturnRequest_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardSparePartReturnRequest" ADD CONSTRAINT "JobCardSparePartReturnRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardSparePartReturnRequest" ADD CONSTRAINT "JobCardSparePartReturnRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
