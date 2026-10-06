-- Parts Inventory Import upload history - keeps the original workbook + outcome stats per upload
CREATE TABLE "PartsInventoryUpload" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fileName" TEXT NOT NULL,
    "fileContent" BYTEA,
    "fileSizeBytes" INTEGER NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successfulRows" INTEGER NOT NULL,
    "failedRows" INTEGER NOT NULL,
    "partsCreated" INTEGER NOT NULL,
    "partsUpdated" INTEGER NOT NULL,
    "totalQuantityAdded" INTEGER NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "uploadedById" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartsInventoryUpload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartsInventoryUpload_uploadedAt_idx" ON "PartsInventoryUpload"("uploadedAt");
CREATE INDEX "PartsInventoryUpload_uploadedById_idx" ON "PartsInventoryUpload"("uploadedById");

ALTER TABLE "PartsInventoryUpload" ADD CONSTRAINT "PartsInventoryUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
