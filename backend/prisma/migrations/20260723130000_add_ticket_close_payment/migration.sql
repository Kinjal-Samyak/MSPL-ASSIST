ALTER TABLE "Ticket"
  ADD COLUMN "paymentMode" TEXT,
  ADD COLUMN "paymentUtrNumber" TEXT,
  ADD COLUMN "paymentAmount" DECIMAL(12,2),
  ADD COLUMN "paymentRecordedAt" TIMESTAMP(3);
