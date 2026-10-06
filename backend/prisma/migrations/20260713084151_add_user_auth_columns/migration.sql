-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;
