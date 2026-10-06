-- CreateEnum
CREATE TYPE "DatasetHealthStatus" AS ENUM ('HEALTHY', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "DatasetCommitMode" AS ENUM ('DRY_RUN', 'COMMIT');

-- CreateEnum
CREATE TYPE "GraphConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "OperationalDataset" (
    "id" UUID NOT NULL,
    "datasetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "healthStatus" "DatasetHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "lockVersion" INTEGER NOT NULL DEFAULT 1,
    "lastSyncedAt" TIMESTAMP(3),
    "schedulerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "schedulerFrequency" TEXT NOT NULL DEFAULT 'MANUAL',
    "schedulerLeaseOwner" TEXT,
    "schedulerLeaseExpiresAt" TIMESTAMP(3),
    "schedulerHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationalDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemaVersion" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "workbookSchemaHash" TEXT NOT NULL,
    "worksheetSchemaHash" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchemaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetVersion" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "workbookVersion" TEXT,
    "worksheetVersion" TEXT,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatasetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetSnapshot" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "datasetVersionId" UUID,
    "snapshotKey" TEXT NOT NULL,
    "snapshotChecksum" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DatasetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DryRunResult" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsValid" INTEGER NOT NULL DEFAULT 0,
    "rowsInvalid" INTEGER NOT NULL DEFAULT 0,
    "rowsInsert" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdate" INTEGER NOT NULL DEFAULT 0,
    "rowsIgnore" INTEGER NOT NULL DEFAULT 0,
    "relationshipFailures" INTEGER NOT NULL DEFAULT 0,
    "validationErrors" INTEGER NOT NULL DEFAULT 0,
    "mappingErrors" INTEGER NOT NULL DEFAULT 0,
    "previewChanges" JSONB,
    "createdByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DryRunResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicrosoftGraphConnection" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT,
    "siteName" TEXT,
    "documentLibraryId" TEXT,
    "documentLibraryName" TEXT,
    "status" "GraphConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MicrosoftGraphConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalProvider" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationalProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalLookupService" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "serviceKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationalLookupService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipValidation" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "relationshipName" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "administratorAccepted" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" INTEGER NOT NULL DEFAULT 0,
    "orphanRecords" INTEGER NOT NULL DEFAULT 0,
    "duplicateKeys" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RelationshipValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemaValidation" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "schemaHash" TEXT NOT NULL,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchemaValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkbookMetadata" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "workbookRole" "WorkbookType" NOT NULL,
    "workbookId" TEXT NOT NULL,
    "workbookName" TEXT NOT NULL,
    "workbookUrl" TEXT NOT NULL,
    "modifiedDate" TIMESTAMP(3),
    "worksheetCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkbookMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetMetadata" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "workbookRole" "WorkbookType" NOT NULL,
    "worksheetName" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "headerRow" INTEGER NOT NULL DEFAULT 1,
    "columnCount" INTEGER NOT NULL DEFAULT 0,
    "columnNames" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksheetMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSummary" (
    "id" UUID NOT NULL,
    "operationalDatasetId" UUID NOT NULL,
    "commitMode" "DatasetCommitMode" NOT NULL,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsIgnored" INTEGER NOT NULL DEFAULT 0,
    "rowsDeleted" INTEGER NOT NULL DEFAULT 0,
    "rowsFailed" INTEGER NOT NULL DEFAULT 0,
    "relationshipErrors" INTEGER NOT NULL DEFAULT 0,
    "validationErrors" INTEGER NOT NULL DEFAULT 0,
    "mappingErrors" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportSummary_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WorkbookConfiguration" ADD COLUMN "operationalDatasetId" UUID;
ALTER TABLE "SyncHistory" ADD COLUMN "operationalDatasetId" UUID;
ALTER TABLE "SyncRun" ADD COLUMN "operationalDatasetId" UUID;
ALTER TABLE "SyncAuditLog" ADD COLUMN "operationalDatasetId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDataset_datasetCode_key" ON "OperationalDataset"("datasetCode");
CREATE INDEX "OperationalDataset_active_idx" ON "OperationalDataset"("active");
CREATE INDEX "OperationalDataset_schedulerEnabled_schedulerFrequency_idx" ON "OperationalDataset"("schedulerEnabled", "schedulerFrequency");
CREATE UNIQUE INDEX "SchemaVersion_operationalDatasetId_versionNumber_key" ON "SchemaVersion"("operationalDatasetId", "versionNumber");
CREATE INDEX "SchemaVersion_operationalDatasetId_workbookSchemaHash_idx" ON "SchemaVersion"("operationalDatasetId", "workbookSchemaHash");
CREATE UNIQUE INDEX "DatasetVersion_operationalDatasetId_versionNumber_key" ON "DatasetVersion"("operationalDatasetId", "versionNumber");
CREATE INDEX "DatasetVersion_operationalDatasetId_committedAt_idx" ON "DatasetVersion"("operationalDatasetId", "committedAt");
CREATE UNIQUE INDEX "DatasetSnapshot_operationalDatasetId_snapshotKey_key" ON "DatasetSnapshot"("operationalDatasetId", "snapshotKey");
CREATE INDEX "DatasetSnapshot_datasetVersionId_idx" ON "DatasetSnapshot"("datasetVersionId");
CREATE INDEX "DryRunResult_operationalDatasetId_createdAt_idx" ON "DryRunResult"("operationalDatasetId", "createdAt");
CREATE UNIQUE INDEX "MicrosoftGraphConnection_operationalDatasetId_key" ON "MicrosoftGraphConnection"("operationalDatasetId");
CREATE INDEX "MicrosoftGraphConnection_status_idx" ON "MicrosoftGraphConnection"("status");
CREATE UNIQUE INDEX "OperationalProvider_operationalDatasetId_providerKey_key" ON "OperationalProvider"("operationalDatasetId", "providerKey");
CREATE UNIQUE INDEX "OperationalLookupService_operationalDatasetId_serviceKey_key" ON "OperationalLookupService"("operationalDatasetId", "serviceKey");
CREATE INDEX "RelationshipValidation_operationalDatasetId_administratorAccepted_idx" ON "RelationshipValidation"("operationalDatasetId", "administratorAccepted");
CREATE INDEX "SchemaValidation_operationalDatasetId_schemaHash_idx" ON "SchemaValidation"("operationalDatasetId", "schemaHash");
CREATE INDEX "WorkbookMetadata_operationalDatasetId_workbookRole_idx" ON "WorkbookMetadata"("operationalDatasetId", "workbookRole");
CREATE UNIQUE INDEX "WorksheetMetadata_operationalDatasetId_workbookRole_worksheetName_key" ON "WorksheetMetadata"("operationalDatasetId", "workbookRole", "worksheetName");
CREATE INDEX "ImportSummary_operationalDatasetId_commitMode_createdAt_idx" ON "ImportSummary"("operationalDatasetId", "commitMode", "createdAt");
CREATE INDEX "WorkbookConfiguration_operationalDatasetId_idx" ON "WorkbookConfiguration"("operationalDatasetId");
CREATE INDEX "SyncHistory_operationalDatasetId_idx" ON "SyncHistory"("operationalDatasetId");
CREATE INDEX "SyncRun_operationalDatasetId_idx" ON "SyncRun"("operationalDatasetId");
CREATE INDEX "SyncAuditLog_operationalDatasetId_idx" ON "SyncAuditLog"("operationalDatasetId");

-- AddForeignKey
ALTER TABLE "SchemaVersion" ADD CONSTRAINT "SchemaVersion_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatasetVersion" ADD CONSTRAINT "DatasetVersion_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatasetSnapshot" ADD CONSTRAINT "DatasetSnapshot_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatasetSnapshot" ADD CONSTRAINT "DatasetSnapshot_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DryRunResult" ADD CONSTRAINT "DryRunResult_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MicrosoftGraphConnection" ADD CONSTRAINT "MicrosoftGraphConnection_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalProvider" ADD CONSTRAINT "OperationalProvider_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalLookupService" ADD CONSTRAINT "OperationalLookupService_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RelationshipValidation" ADD CONSTRAINT "RelationshipValidation_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchemaValidation" ADD CONSTRAINT "SchemaValidation_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbookMetadata" ADD CONSTRAINT "WorkbookMetadata_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksheetMetadata" ADD CONSTRAINT "WorksheetMetadata_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportSummary" ADD CONSTRAINT "ImportSummary_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbookConfiguration" ADD CONSTRAINT "WorkbookConfiguration_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyncHistory" ADD CONSTRAINT "SyncHistory_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyncAuditLog" ADD CONSTRAINT "SyncAuditLog_operationalDatasetId_fkey" FOREIGN KEY ("operationalDatasetId") REFERENCES "OperationalDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
