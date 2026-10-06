-- User: soft-delete (Admin/Service Manager "Delete User" - preserves all historical
-- FK references from tickets, job cards, activities, etc. Mirrors Hub.deletedAt.)
ALTER TABLE "User"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
