-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WHATSAPP', 'PHONE', 'WALK_IN', 'ADMIN');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COORDINATOR', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'PENDING', 'COMPLETED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "registeredMobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "whatsAppNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COORDINATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hub" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" UUID NOT NULL,
    "modelCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "mvTrackNumber" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleModelId" UUID NOT NULL,
    "hubId" UUID NOT NULL,
    "rentalStatus" "RentalStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusMaster" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "deploymentId" UUID,
    "issueCategoryId" UUID NOT NULL,
    "statusId" UUID NOT NULL,
    "source" "TicketSource" NOT NULL DEFAULT 'WHATSAPP',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "issueDescription" TEXT NOT NULL,
    "estimatedCharges" DECIMAL(12,2),
    "finalCharges" DECIMAL(12,2),
    "coordinatorNotes" TEXT,
    "sendUpdate" BOOLEAN NOT NULL DEFAULT false,
    "lastPublishedAt" TIMESTAMP(3),
    "lastPublishedById" UUID,
    "notificationStatus" "NotificationStatus" NOT NULL DEFAULT 'NOT_SENT',
    "deploymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" UUID,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "eta" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "responseId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketHistory" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "oldStatusId" UUID NOT NULL,
    "newStatusId" UUID NOT NULL,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedById" UUID,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_registeredMobile_idx" ON "Customer"("registeredMobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_mobile_idx" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Hub_name_key" ON "Hub"("name");

-- CreateIndex
CREATE INDEX "Hub_active_idx" ON "Hub"("active");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_modelCode_key" ON "VehicleModel"("modelCode");

-- CreateIndex
CREATE INDEX "VehicleModel_active_idx" ON "VehicleModel"("active");

-- CreateIndex
CREATE INDEX "Deployment_customerId_idx" ON "Deployment"("customerId");

-- CreateIndex
CREATE INDEX "Deployment_mvTrackNumber_idx" ON "Deployment"("mvTrackNumber");

-- CreateIndex
CREATE INDEX "Deployment_vehicleNumber_idx" ON "Deployment"("vehicleNumber");

-- CreateIndex
CREATE INDEX "Deployment_vehicleModelId_idx" ON "Deployment"("vehicleModelId");

-- CreateIndex
CREATE INDEX "Deployment_hubId_idx" ON "Deployment"("hubId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusMaster_name_key" ON "StatusMaster"("name");

-- CreateIndex
CREATE INDEX "StatusMaster_active_idx" ON "StatusMaster"("active");

-- CreateIndex
CREATE INDEX "StatusMaster_displayOrder_idx" ON "StatusMaster"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "IssueCategory_name_key" ON "IssueCategory"("name");

-- CreateIndex
CREATE INDEX "IssueCategory_active_idx" ON "IssueCategory"("active");

-- CreateIndex
CREATE INDEX "IssueCategory_displayOrder_idx" ON "IssueCategory"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_ticketNumber_idx" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_customerId_idx" ON "Ticket"("customerId");

-- CreateIndex
CREATE INDEX "Ticket_deploymentId_idx" ON "Ticket"("deploymentId");

-- CreateIndex
CREATE INDEX "Ticket_issueCategoryId_idx" ON "Ticket"("issueCategoryId");

-- CreateIndex
CREATE INDEX "Ticket_statusId_idx" ON "Ticket"("statusId");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_source_idx" ON "Ticket"("source");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketComment_createdById_idx" ON "TicketComment"("createdById");

-- CreateIndex
CREATE INDEX "NotificationLog_ticketId_idx" ON "NotificationLog"("ticketId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "TicketHistory_ticketId_idx" ON "TicketHistory"("ticketId");

-- CreateIndex
CREATE INDEX "TicketHistory_oldStatusId_idx" ON "TicketHistory"("oldStatusId");

-- CreateIndex
CREATE INDEX "TicketHistory_newStatusId_idx" ON "TicketHistory"("newStatusId");

-- CreateIndex
CREATE INDEX "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");

-- CreateIndex
CREATE INDEX "TicketActivity_performedAt_idx" ON "TicketActivity"("performedAt");

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_issueCategoryId_fkey" FOREIGN KEY ("issueCategoryId") REFERENCES "IssueCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_lastPublishedById_fkey" FOREIGN KEY ("lastPublishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_oldStatusId_fkey" FOREIGN KEY ("oldStatusId") REFERENCES "StatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_newStatusId_fkey" FOREIGN KEY ("newStatusId") REFERENCES "StatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

