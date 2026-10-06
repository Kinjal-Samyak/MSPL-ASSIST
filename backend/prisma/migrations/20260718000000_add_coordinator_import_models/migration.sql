-- Isolated Coordinator Excel Import Wizard persistence. No existing production tables are altered.
CREATE TYPE "ImportBatchStatus" AS ENUM ('UPLOADED', 'VALIDATED', 'PREVIEWED', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "ImportErrorSeverity" AS ENUM ('WARNING', 'ERROR');

CREATE TABLE "ImportBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fileName" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "worksheetName" TEXT NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'UPLOADED',
  "rowsFound" INTEGER NOT NULL DEFAULT 0,
  "rowsValid" INTEGER NOT NULL DEFAULT 0,
  "rowsInserted" INTEGER NOT NULL DEFAULT 0,
  "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
  "rowsDuplicate" INTEGER NOT NULL DEFAULT 0,
  "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
  "rowsFailed" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "columnMapping" JSONB NOT NULL,
  "preview" JSONB,
  "importedById" UUID,
  "committedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ImportError" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "importBatchId" UUID NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "severity" "ImportErrorSeverity" NOT NULL,
  "errorType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "suggestedFix" TEXT NOT NULL,
  "rowData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportError_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ImportBatch_status_createdAt_idx" ON "ImportBatch"("status", "createdAt");
CREATE INDEX "ImportBatch_importedById_idx" ON "ImportBatch"("importedById");
CREATE INDEX "ImportError_importBatchId_rowNumber_idx" ON "ImportError"("importBatchId", "rowNumber");
CREATE INDEX "ImportError_severity_idx" ON "ImportError"("severity");
