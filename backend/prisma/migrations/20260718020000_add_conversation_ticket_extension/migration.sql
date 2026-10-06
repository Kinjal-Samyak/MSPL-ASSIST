ALTER TABLE "Ticket" ADD COLUMN "rideabilityStatus" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "conversationMetadata" JSONB;
ALTER TABLE "TicketIssueItem" ADD COLUMN "issueSubcategory" TEXT;
