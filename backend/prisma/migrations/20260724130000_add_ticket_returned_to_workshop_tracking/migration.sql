-- Return-to-workshop tracking (Coordinator sends an RFD ticket back for rework)
ALTER TABLE "Ticket" ADD COLUMN "returnedToWorkshopCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ticket" ADD COLUMN "returnedToWorkshopAt" TIMESTAMP(3);
