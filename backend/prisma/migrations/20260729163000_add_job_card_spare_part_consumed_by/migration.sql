-- Powers the Job Card Parts Timeline's "Consumed" stage (User, Date & Time).
ALTER TABLE "JobCardSparePart" ADD COLUMN "consumedById" UUID;
ALTER TABLE "JobCardSparePart" ADD COLUMN "consumedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "JobCardSparePart" ADD CONSTRAINT "JobCardSparePart_consumedById_fkey" FOREIGN KEY ("consumedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
