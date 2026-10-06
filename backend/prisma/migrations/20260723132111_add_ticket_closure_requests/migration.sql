-- CreateEnum
CREATE TYPE "TicketClosureRequestType" AS ENUM ('CANCELLATION', 'EARLY_CLOSURE');

-- CreateEnum
CREATE TYPE "TicketClosureReasonCategory" AS ENUM ('ACCOUNT_CLOSURE', 'VEHICLE_EXCHANGE', 'VEHICLE_UPGRADE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketClosureRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "PartCategory_active_idx";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ImportBatch" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ImportError" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobCard" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobCardPdfHistory" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobCardSparePart" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RolePermission" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VehicleModelRate" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TicketClosureRequest" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "requestType" "TicketClosureRequestType" NOT NULL,
    "reasonCategory" "TicketClosureReasonCategory",
    "reason" TEXT NOT NULL,
    "paymentWaived" BOOLEAN NOT NULL DEFAULT false,
    "paymentWaiveRemarks" TEXT,
    "paymentMode" TEXT,
    "paymentUtrNumber" TEXT,
    "paymentAmount" DECIMAL(12,2),
    "status" "TicketClosureRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" UUID NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "decisionRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketClosureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" UUID NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "customerId" UUID,
    "currentTicketId" UUID,
    "currentState" TEXT NOT NULL DEFAULT 'MAIN_MENU',
    "conversationData" JSONB NOT NULL DEFAULT '{}',
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketClosureRequest_ticketId_idx" ON "TicketClosureRequest"("ticketId");

-- CreateIndex
CREATE INDEX "TicketClosureRequest_status_idx" ON "TicketClosureRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSession_whatsappNumber_key" ON "ConversationSession"("whatsappNumber");

-- CreateIndex
CREATE INDEX "ConversationSession_whatsappNumber_idx" ON "ConversationSession"("whatsappNumber");

-- CreateIndex
CREATE INDEX "ConversationSession_currentState_idx" ON "ConversationSession"("currentState");

-- CreateIndex
CREATE INDEX "ConversationSession_expiresAt_idx" ON "ConversationSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "TicketClosureRequest" ADD CONSTRAINT "TicketClosureRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketClosureRequest" ADD CONSTRAINT "TicketClosureRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketClosureRequest" ADD CONSTRAINT "TicketClosureRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "RelationshipValidation_operationalDatasetId_administratorAccept" RENAME TO "RelationshipValidation_operationalDatasetId_administratorAc_idx";

-- RenameIndex
ALTER INDEX "WorksheetMetadata_operationalDatasetId_workbookRole_worksheetNa" RENAME TO "WorksheetMetadata_operationalDatasetId_workbookRole_workshe_key";
