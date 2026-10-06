ALTER TABLE "User"
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "UserHub" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "hubId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHub_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSetting" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "editableByAdmin" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserHub_userId_hubId_key" ON "UserHub"("userId", "hubId");
CREATE INDEX "UserHub_userId_idx" ON "UserHub"("userId");
CREATE INDEX "UserHub_hubId_idx" ON "UserHub"("hubId");
CREATE UNIQUE INDEX "AppSetting_settingKey_key" ON "AppSetting"("settingKey");
CREATE INDEX "AppSetting_category_idx" ON "AppSetting"("category");
CREATE INDEX "User_active_idx" ON "User"("active");

ALTER TABLE "UserHub"
ADD CONSTRAINT "UserHub_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserHub"
ADD CONSTRAINT "UserHub_hubId_fkey"
FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppSetting"
ADD CONSTRAINT "AppSetting_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
