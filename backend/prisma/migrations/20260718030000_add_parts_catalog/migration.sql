-- Parts Module Stage 1: catalogue and categories only. No existing table is altered.
CREATE TABLE "PartCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartSubcategory" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartSubcategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Part" (
    "id" UUID NOT NULL,
    "partCode" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "subcategoryId" UUID,
    "brand" TEXT,
    "manufacturer" TEXT,
    "oemPartNumber" TEXT,
    "internalPartNumber" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "partCost" DECIMAL(12,2) NOT NULL,
    "warrantyEligible" BOOLEAN NOT NULL DEFAULT false,
    "consumable" BOOLEAN NOT NULL DEFAULT false,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "maximumStock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartVehicleCompatibility" (
    "id" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "modelCode" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartVehicleCompatibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartCategory_name_key" ON "PartCategory"("name");
CREATE UNIQUE INDEX "PartSubcategory_categoryId_name_key" ON "PartSubcategory"("categoryId", "name");
CREATE UNIQUE INDEX "Part_partCode_key" ON "Part"("partCode");
CREATE UNIQUE INDEX "PartVehicleCompatibility_partId_modelCode_key" ON "PartVehicleCompatibility"("partId", "modelCode");
CREATE INDEX "PartCategory_active_idx" ON "PartCategory"("active");
CREATE INDEX "PartSubcategory_categoryId_active_idx" ON "PartSubcategory"("categoryId", "active");
CREATE INDEX "Part_categoryId_active_idx" ON "Part"("categoryId", "active");
CREATE INDEX "Part_subcategoryId_idx" ON "Part"("subcategoryId");
CREATE INDEX "Part_partName_idx" ON "Part"("partName");
CREATE INDEX "PartVehicleCompatibility_modelCode_idx" ON "PartVehicleCompatibility"("modelCode");

ALTER TABLE "PartSubcategory" ADD CONSTRAINT "PartSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PartCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Part" ADD CONSTRAINT "Part_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PartCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Part" ADD CONSTRAINT "Part_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "PartSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartVehicleCompatibility" ADD CONSTRAINT "PartVehicleCompatibility_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
