-- CreateEnum
CREATE TYPE "WorkbookType" AS ENUM ('MASTER', 'INVENTORY');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('MASTER_TO_INVENTORY', 'INVENTORY_TO_MASTER');

-- CreateEnum
CREATE TYPE "SyncExecutionStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SyncTriggerType" AS ENUM ('MANUAL', 'SCHEDULER');

-- CreateEnum
CREATE TYPE "SyncAuditLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "WorkbookConfiguration" (
    "id" UUID NOT NULL,
    "workbookType" "WorkbookType" NOT NULL,
    "workbookName" TEXT NOT NULL,
    "workbookUrl" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'MICROSOFT_GRAPH',
    "sourceKind" TEXT NOT NULL DEFAULT 'WORKBOOK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkbookConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetConfiguration" (
    "id" UUID NOT NULL,
    "workbookConfigurationId" UUID NOT NULL,
    "worksheetName" TEXT NOT NULL,
    "headerRow" INTEGER NOT NULL DEFAULT 1,
    "columnCount" INTEGER,
    "columnNames" JSONB,
    "isSelected" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorksheetConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipMapping" (
    "id" UUID NOT NULL,
    "masterWorkbookConfigurationId" UUID NOT NULL,
    "inventoryWorkbookConfigurationId" UUID NOT NULL,
    "masterWorksheetConfigurationId" UUID,
    "inventoryWorksheetConfigurationId" UUID,
    "relationshipType" "RelationshipType" NOT NULL,
    "primaryKey" TEXT NOT NULL,
    "relationshipField" TEXT NOT NULL,
    "confidence" DECIMAL(5,2),
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastVerified" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnMapping" (
    "id" UUID NOT NULL,
    "worksheetConfigurationId" UUID NOT NULL,
    "sourceColumn" TEXT NOT NULL,
    "targetColumn" TEXT NOT NULL,
    "confidence" DECIMAL(5,2),
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "mappingVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkbookSchemaVersion" (
    "id" UUID NOT NULL,
    "workbookConfigurationId" UUID NOT NULL,
    "worksheetConfigurationId" UUID,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "schemaHash" TEXT NOT NULL,
    "columnCount" INTEGER NOT NULL,
    "columnNames" JSONB NOT NULL,
    "headerOrder" JSONB NOT NULL,
    "modifiedDate" TIMESTAMP(3),
    "detectedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkbookSchemaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncHistory" (
    "id" UUID NOT NULL,
    "syncNumber" INTEGER NOT NULL,
    "workbookVersion" TEXT,
    "schemaVersion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "triggeredBy" "SyncTriggerType" NOT NULL,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsDeleted" INTEGER NOT NULL DEFAULT 0,
    "rowsIgnored" INTEGER NOT NULL DEFAULT 0,
    "rowsFailed" INTEGER NOT NULL DEFAULT 0,
    "relationshipErrors" INTEGER NOT NULL DEFAULT 0,
    "mappingErrors" INTEGER NOT NULL DEFAULT 0,
    "validationErrors" INTEGER NOT NULL DEFAULT 0,
    "status" "SyncExecutionStatus" NOT NULL,
    "failureReason" TEXT,
    "exception" TEXT,
    "stackTrace" TEXT,
    "initiatedById" UUID,
    "machine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" UUID NOT NULL,
    "syncHistoryId" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "SyncExecutionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsDeleted" INTEGER NOT NULL DEFAULT 0,
    "rowsIgnored" INTEGER NOT NULL DEFAULT 0,
    "rowsFailed" INTEGER NOT NULL DEFAULT 0,
    "relationshipErrors" INTEGER NOT NULL DEFAULT 0,
    "mappingErrors" INTEGER NOT NULL DEFAULT 0,
    "validationErrors" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicrosoftGraphToken" (
    "id" UUID NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicrosoftGraphToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncAuditLog" (
    "id" UUID NOT NULL,
    "syncHistoryId" UUID NOT NULL,
    "level" "SyncAuditLevel" NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "stackTrace" TEXT,
    "machine" TEXT,
    "user" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkbookConfiguration_workbookType_isActive_idx" ON "WorkbookConfiguration"("workbookType", "isActive");

-- CreateIndex
CREATE INDEX "WorkbookConfiguration_createdById_idx" ON "WorkbookConfiguration"("createdById");

-- CreateIndex
CREATE INDEX "WorkbookConfiguration_updatedById_idx" ON "WorkbookConfiguration"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "WorkbookConfiguration_workbookType_workbookName_key" ON "WorkbookConfiguration"("workbookType", "workbookName");

-- CreateIndex
CREATE INDEX "WorksheetConfiguration_workbookConfigurationId_isSelected_idx" ON "WorksheetConfiguration"("workbookConfigurationId", "isSelected");

-- CreateIndex
CREATE INDEX "WorksheetConfiguration_createdById_idx" ON "WorksheetConfiguration"("createdById");

-- CreateIndex
CREATE INDEX "WorksheetConfiguration_updatedById_idx" ON "WorksheetConfiguration"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "WorksheetConfiguration_workbookConfigurationId_worksheetNam_key" ON "WorksheetConfiguration"("workbookConfigurationId", "worksheetName");

-- CreateIndex
CREATE INDEX "RelationshipMapping_primaryKey_idx" ON "RelationshipMapping"("primaryKey");

-- CreateIndex
CREATE INDEX "RelationshipMapping_relationshipField_idx" ON "RelationshipMapping"("relationshipField");

-- CreateIndex
CREATE INDEX "RelationshipMapping_createdById_idx" ON "RelationshipMapping"("createdById");

-- CreateIndex
CREATE INDEX "RelationshipMapping_updatedById_idx" ON "RelationshipMapping"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipMapping_masterWorkbookConfigurationId_inventory_key" ON "RelationshipMapping"("masterWorkbookConfigurationId", "inventoryWorkbookConfigurationId", "relationshipType", "version");

-- CreateIndex
CREATE INDEX "ColumnMapping_targetColumn_idx" ON "ColumnMapping"("targetColumn");

-- CreateIndex
CREATE INDEX "ColumnMapping_createdById_idx" ON "ColumnMapping"("createdById");

-- CreateIndex
CREATE INDEX "ColumnMapping_updatedById_idx" ON "ColumnMapping"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnMapping_worksheetConfigurationId_sourceColumn_mapping_key" ON "ColumnMapping"("worksheetConfigurationId", "sourceColumn", "mappingVersion");

-- CreateIndex
CREATE INDEX "WorkbookSchemaVersion_worksheetConfigurationId_detectedDate_idx" ON "WorkbookSchemaVersion"("worksheetConfigurationId", "detectedDate");

-- CreateIndex
CREATE INDEX "WorkbookSchemaVersion_verifiedById_idx" ON "WorkbookSchemaVersion"("verifiedById");

-- CreateIndex
CREATE UNIQUE INDEX "WorkbookSchemaVersion_workbookConfigurationId_schemaHash_key" ON "WorkbookSchemaVersion"("workbookConfigurationId", "schemaHash");

-- CreateIndex
CREATE UNIQUE INDEX "SyncHistory_syncNumber_key" ON "SyncHistory"("syncNumber");

-- CreateIndex
CREATE INDEX "SyncHistory_status_idx" ON "SyncHistory"("status");

-- CreateIndex
CREATE INDEX "SyncHistory_startedAt_idx" ON "SyncHistory"("startedAt");

-- CreateIndex
CREATE INDEX "SyncHistory_triggeredBy_idx" ON "SyncHistory"("triggeredBy");

-- CreateIndex
CREATE INDEX "SyncHistory_initiatedById_idx" ON "SyncHistory"("initiatedById");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SyncRun_syncHistoryId_stage_orderIndex_key" ON "SyncRun"("syncHistoryId", "stage", "orderIndex");

-- CreateIndex
CREATE INDEX "MicrosoftGraphToken_accessTokenExpiresAt_idx" ON "MicrosoftGraphToken"("accessTokenExpiresAt");

-- CreateIndex
CREATE INDEX "MicrosoftGraphToken_revokedAt_idx" ON "MicrosoftGraphToken"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MicrosoftGraphToken_tenantId_clientId_key" ON "MicrosoftGraphToken"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "SyncAuditLog_syncHistoryId_idx" ON "SyncAuditLog"("syncHistoryId");

-- CreateIndex
CREATE INDEX "SyncAuditLog_level_idx" ON "SyncAuditLog"("level");

-- CreateIndex
CREATE INDEX "SyncAuditLog_createdAt_idx" ON "SyncAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkbookConfiguration" ADD CONSTRAINT "WorkbookConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbookConfiguration" ADD CONSTRAINT "WorkbookConfiguration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetConfiguration" ADD CONSTRAINT "WorksheetConfiguration_workbookConfigurationId_fkey" FOREIGN KEY ("workbookConfigurationId") REFERENCES "WorkbookConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetConfiguration" ADD CONSTRAINT "WorksheetConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetConfiguration" ADD CONSTRAINT "WorksheetConfiguration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipMapping" ADD CONSTRAINT "RelationshipMapping_masterWorkbookConfigurationId_fkey" FOREIGN KEY ("masterWorkbookConfigurationId") REFERENCES "WorkbookConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipMapping" ADD CONSTRAINT "RelationshipMapping_inventoryWorkbookConfigurationId_fkey" FOREIGN KEY ("inventoryWorkbookConfigurationId") REFERENCES "WorkbookConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipMapping" ADD CONSTRAINT "RelationshipMapping_masterWorksheetConfigurationId_fkey" FOREIGN KEY ("masterWorksheetConfigurationId") REFERENCES "WorksheetConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipMapping" ADD CONSTRAINT "RelationshipMapping_inventoryWorksheetConfigurationId_fkey" FOREIGN KEY ("inventoryWorksheetConfigurationId") REFERENCES "WorksheetConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipMapping" ADD CONSTRAINT "RelationshipMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipMapping" ADD CONSTRAINT "RelationshipMapping_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnMapping" ADD CONSTRAINT "ColumnMapping_worksheetConfigurationId_fkey" FOREIGN KEY ("worksheetConfigurationId") REFERENCES "WorksheetConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnMapping" ADD CONSTRAINT "ColumnMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnMapping" ADD CONSTRAINT "ColumnMapping_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbookSchemaVersion" ADD CONSTRAINT "WorkbookSchemaVersion_workbookConfigurationId_fkey" FOREIGN KEY ("workbookConfigurationId") REFERENCES "WorkbookConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbookSchemaVersion" ADD CONSTRAINT "WorkbookSchemaVersion_worksheetConfigurationId_fkey" FOREIGN KEY ("worksheetConfigurationId") REFERENCES "WorksheetConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkbookSchemaVersion" ADD CONSTRAINT "WorkbookSchemaVersion_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncHistory" ADD CONSTRAINT "SyncHistory_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_syncHistoryId_fkey" FOREIGN KEY ("syncHistoryId") REFERENCES "SyncHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrosoftGraphToken" ADD CONSTRAINT "MicrosoftGraphToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrosoftGraphToken" ADD CONSTRAINT "MicrosoftGraphToken_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncAuditLog" ADD CONSTRAINT "SyncAuditLog_syncHistoryId_fkey" FOREIGN KEY ("syncHistoryId") REFERENCES "SyncHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
