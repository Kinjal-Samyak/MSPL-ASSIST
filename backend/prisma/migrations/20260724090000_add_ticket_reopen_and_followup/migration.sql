-- Add REOPENED to TicketWorkflowStage enum
ALTER TYPE "TicketWorkflowStage" ADD VALUE 'REOPENED';

-- Reopen tracking + parent/child follow-up ticket linkage
ALTER TABLE "Ticket" ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ticket" ADD COLUMN "reopenedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "parentTicketId" UUID;

CREATE INDEX "Ticket_parentTicketId_idx" ON "Ticket"("parentTicketId");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_parentTicketId_fkey" FOREIGN KEY ("parentTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
