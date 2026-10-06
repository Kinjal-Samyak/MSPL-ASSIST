CREATE TABLE "NotificationMessage" (
    "id" UUID NOT NULL,
    "templateId" UUID,
    "eventType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "responseId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationChannelSetting" (
    "id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannelSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");
CREATE INDEX "NotificationTemplate_eventType_idx" ON "NotificationTemplate"("eventType");
CREATE INDEX "NotificationTemplate_channel_idx" ON "NotificationTemplate"("channel");
CREATE INDEX "NotificationTemplate_active_idx" ON "NotificationTemplate"("active");

CREATE UNIQUE INDEX "NotificationChannelSetting_channel_key" ON "NotificationChannelSetting"("channel");
CREATE INDEX "NotificationChannelSetting_enabled_idx" ON "NotificationChannelSetting"("enabled");

CREATE INDEX "NotificationMessage_status_idx" ON "NotificationMessage"("status");
CREATE INDEX "NotificationMessage_channel_idx" ON "NotificationMessage"("channel");
CREATE INDEX "NotificationMessage_eventType_idx" ON "NotificationMessage"("eventType");
CREATE INDEX "NotificationMessage_sourceModule_idx" ON "NotificationMessage"("sourceModule");
CREATE INDEX "NotificationMessage_sourceEntityId_idx" ON "NotificationMessage"("sourceEntityId");
CREATE INDEX "NotificationMessage_readAt_idx" ON "NotificationMessage"("readAt");
CREATE INDEX "NotificationMessage_archivedAt_idx" ON "NotificationMessage"("archivedAt");

ALTER TABLE "NotificationMessage"
ADD CONSTRAINT "NotificationMessage_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
