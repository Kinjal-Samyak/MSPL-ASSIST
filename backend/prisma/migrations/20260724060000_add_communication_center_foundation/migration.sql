-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "NotificationStatus" ADD VALUE 'READ';

-- AlterTable
ALTER TABLE "NotificationMessage" ADD COLUMN "sentById" UUID;

-- CreateIndex
CREATE INDEX "NotificationMessage_sentById_idx" ON "NotificationMessage"("sentById");

-- AddForeignKey
ALTER TABLE "NotificationMessage" ADD CONSTRAINT "NotificationMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
