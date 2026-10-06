-- CreateTable TicketIssueItem
CREATE TABLE "TicketIssueItem" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "issueCategoryId" UUID NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "issueStatus" TEXT NOT NULL DEFAULT 'Open',
    "sequenceNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketIssueItem_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "TicketIssueItem" ADD CONSTRAINT "TicketIssueItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketIssueItem" ADD CONSTRAINT "TicketIssueItem_issueCategoryId_fkey" FOREIGN KEY ("issueCategoryId") REFERENCES "IssueCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes for TicketIssueItem
CREATE INDEX "TicketIssueItem_ticketId_idx" ON "TicketIssueItem"("ticketId");
CREATE INDEX "TicketIssueItem_issueCategoryId_idx" ON "TicketIssueItem"("issueCategoryId");
CREATE INDEX "TicketIssueItem_sequenceNumber_idx" ON "TicketIssueItem"("sequenceNumber");

-- Make TicketHistory.oldStatusId nullable
ALTER TABLE "TicketHistory" ALTER COLUMN "oldStatusId" DROP NOT NULL;

-- Drop existing foreign key constraint and recreate as optional
ALTER TABLE "TicketHistory" DROP CONSTRAINT "TicketHistory_oldStatusId_fkey";
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_oldStatusId_fkey" FOREIGN KEY ("oldStatusId") REFERENCES "StatusMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
