-- Technician spare-part request/approval lifecycle
CREATE TYPE "SparePartRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVERSED');

CREATE TABLE "JobCardSparePartRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobCardId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "status" "SparePartRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionRemarks" TEXT,
    "reversedById" UUID,
    "reversedAt" TIMESTAMP(3),
    "reversalRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCardSparePartRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobCardSparePartRequest_jobCardId_idx" ON "JobCardSparePartRequest"("jobCardId");
CREATE INDEX "JobCardSparePartRequest_partId_idx" ON "JobCardSparePartRequest"("partId");
CREATE INDEX "JobCardSparePartRequest_status_idx" ON "JobCardSparePartRequest"("status");

ALTER TABLE "JobCardSparePartRequest" ADD CONSTRAINT "JobCardSparePartRequest_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobCardSparePartRequest" ADD CONSTRAINT "JobCardSparePartRequest_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobCardSparePartRequest" ADD CONSTRAINT "JobCardSparePartRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobCardSparePartRequest" ADD CONSTRAINT "JobCardSparePartRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobCardSparePartRequest" ADD CONSTRAINT "JobCardSparePartRequest_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
