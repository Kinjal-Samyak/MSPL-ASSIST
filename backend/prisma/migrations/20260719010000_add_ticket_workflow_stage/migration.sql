ALTER TYPE "Role" ADD VALUE 'SERVICE_TL';

CREATE TYPE "TicketWorkflowStage" AS ENUM ('CREATED', 'SERVICE_TL_REVIEW', 'CONSULTATION_RESOLVED', 'WORKSHOP_REQUIRED', 'RFD');

CREATE TYPE "JobCardStage" AS ENUM ('IN_PROGRESS', 'WAITING_PARTS', 'RFD');

ALTER TABLE "Ticket"
ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "escalatedAt" TIMESTAMP(3),
ADD COLUMN "workflowStage" "TicketWorkflowStage" NOT NULL DEFAULT 'CREATED',
ADD COLUMN "serviceTlId" UUID;

CREATE INDEX "Ticket_workflowStage_idx" ON "Ticket"("workflowStage");

CREATE INDEX "Ticket_serviceTlId_idx" ON "Ticket"("serviceTlId");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_serviceTlId_fkey" FOREIGN KEY ("serviceTlId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Part" ADD COLUMN "availableQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "JobCard" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobCardNumber" TEXT NOT NULL,
  "ticketId" UUID NOT NULL,
  "technicianId" UUID NOT NULL,
  "workflowStage" "JobCardStage" NOT NULL DEFAULT 'IN_PROGRESS',
  "initialObservation" TEXT,
  "rootCause" TEXT,
  "workPerformed" TEXT,
  "technicianRemarks" TEXT,
  "labourCharges" DECIMAL(12,2),
  "partsCharges" DECIMAL(12,2),
  "otherCharges" DECIMAL(12,2),
  "totalCharges" DECIMAL(12,2),
  "estimatedCompletionAt" TIMESTAMP(3),
  "actualCompletionAt" TIMESTAMP(3),
  "completedByName" TEXT,
  "closureRemarks" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "lastEditedAt" TIMESTAMP(3),
  "partsRequisitionNumber" TEXT,
  "partsRequisitionCreatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobCard_jobCardNumber_key" ON "JobCard"("jobCardNumber");

CREATE UNIQUE INDEX "JobCard_ticketId_key" ON "JobCard"("ticketId");

CREATE UNIQUE INDEX "JobCard_partsRequisitionNumber_key" ON "JobCard"("partsRequisitionNumber");

CREATE INDEX "JobCard_workflowStage_idx" ON "JobCard"("workflowStage");

CREATE INDEX "JobCard_technicianId_idx" ON "JobCard"("technicianId");

ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "JobCardSparePart" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobCardId" UUID NOT NULL,
  "partId" UUID NOT NULL,
  "requiredQuantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobCardSparePart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobCardSparePart_jobCardId_partId_key" ON "JobCardSparePart"("jobCardId", "partId");

CREATE INDEX "JobCardSparePart_jobCardId_idx" ON "JobCardSparePart"("jobCardId");

CREATE INDEX "JobCardSparePart_partId_idx" ON "JobCardSparePart"("partId");

ALTER TABLE "JobCardSparePart" ADD CONSTRAINT "JobCardSparePart_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobCardSparePart" ADD CONSTRAINT "JobCardSparePart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "JobCardPdfHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobCardId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "generatedById" UUID,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobCardPdfHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobCardPdfHistory_jobCardId_idx" ON "JobCardPdfHistory"("jobCardId");

CREATE INDEX "JobCardPdfHistory_generatedAt_idx" ON "JobCardPdfHistory"("generatedAt");

ALTER TABLE "JobCardPdfHistory" ADD CONSTRAINT "JobCardPdfHistory_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobCardPdfHistory" ADD CONSTRAINT "JobCardPdfHistory_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
