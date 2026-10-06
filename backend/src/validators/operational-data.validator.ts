import { OPERATIONAL_SYNC_FREQUENCIES, type OperationalSyncFrequency } from "../constants/operational-data.constants";
import type {
  BrowseOneDriveItemsRequestDto,
  DetectMappingSuggestionsRequestDto,
  GraphAuthExchangeRequestDto,
  InventoryColumnMappingDto,
  LoadWorkbookHeadersRequestDto,
  MasterColumnMappingDto,
  OperationalFolderScanRequestDto,
  PreviewOperationalConfigurationRequestDto,
  SaveOperationalWizardConfigurationDto,
  UpdateOperationalDataSettingsDto,
  ValidateOperationalDataRequestDto,
  ValidateWorkbookUrlsRequestDto,
  WorkbookWorksheetsRequestDto,
} from "../dto/operational-data.dto";
import { ValidationError } from "../errors";

function normalizeRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(`${field} is required.`);
  }
  return normalized;
}

function normalizeOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeBoolean(value: unknown, field: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  throw new ValidationError(`${field} must be a boolean.`);
}

function normalizeFrequency(value: unknown): OperationalSyncFrequency {
  if (typeof value !== "string") {
    throw new ValidationError(
      "syncFrequency must be one of MANUAL, FIVE_MINUTES, FIFTEEN_MINUTES, THIRTY_MINUTES, HOURLY, DAILY."
    );
  }
  const normalized = value.trim().toUpperCase() as OperationalSyncFrequency;
  if (!OPERATIONAL_SYNC_FREQUENCIES.includes(normalized)) {
    throw new ValidationError(
      "syncFrequency must be one of MANUAL, FIVE_MINUTES, FIFTEEN_MINUTES, THIRTY_MINUTES, HOURLY, DAILY."
    );
  }
  return normalized;
}

function normalizeArrayOfString(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array.`);
  }
  const normalized = value.map((entry) => normalizeRequiredString(entry, field));
  if (normalized.length === 0) {
    throw new ValidationError(`${field} is required.`);
  }
  return normalized;
}

function normalizeObject(value: unknown, field: string): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function normalizeMasterMapping(value: unknown): MasterColumnMappingDto {
  if (value == null || typeof value !== "object") {
    throw new ValidationError("masterColumnMapping must be an object.");
  }
  const mapping = value as Record<string, unknown>;
  return {
    customerName: normalizeRequiredString(mapping.customerName, "masterColumnMapping.customerName"),
    phone: normalizeRequiredString(mapping.phone, "masterColumnMapping.phone"),
    hub: normalizeRequiredString(mapping.hub, "masterColumnMapping.hub"),
    vehicleNumber: normalizeRequiredString(mapping.vehicleNumber, "masterColumnMapping.vehicleNumber"),
    mvTrackNumber: normalizeRequiredString(mapping.mvTrackNumber, "masterColumnMapping.mvTrackNumber"),
    plan: normalizeRequiredString(mapping.plan, "masterColumnMapping.plan"),
    rentalStatus: normalizeRequiredString(mapping.rentalStatus, "masterColumnMapping.rentalStatus"),
    deploymentDate: normalizeRequiredString(mapping.deploymentDate, "masterColumnMapping.deploymentDate"),
    returnDate: normalizeRequiredString(mapping.returnDate, "masterColumnMapping.returnDate"),
    coordinator: normalizeRequiredString(mapping.coordinator, "masterColumnMapping.coordinator"),
  };
}

function normalizeInventoryMapping(value: unknown): InventoryColumnMappingDto {
  if (value == null || typeof value !== "object") {
    throw new ValidationError("inventoryColumnMapping must be an object.");
  }
  const mapping = value as Record<string, unknown>;
  return {
    mvTrackNumber: normalizeRequiredString(mapping.mvTrackNumber, "inventoryColumnMapping.mvTrackNumber"),
    vehicleNumber: normalizeRequiredString(mapping.vehicleNumber, "inventoryColumnMapping.vehicleNumber"),
    model: normalizeRequiredString(mapping.model, "inventoryColumnMapping.model"),
    modelCode: normalizeRequiredString(mapping.modelCode, "inventoryColumnMapping.modelCode"),
    status: normalizeRequiredString(mapping.status, "inventoryColumnMapping.status"),
    hub: normalizeRequiredString(mapping.hub, "inventoryColumnMapping.hub"),
    battery: normalizeRequiredString(mapping.battery, "inventoryColumnMapping.battery"),
    iotDevice: normalizeRequiredString(mapping.iotDevice, "inventoryColumnMapping.iotDevice"),
    vin: normalizeRequiredString(mapping.vin, "inventoryColumnMapping.vin"),
    motorNumber: normalizeRequiredString(mapping.motorNumber, "inventoryColumnMapping.motorNumber"),
    chassisNumber: normalizeRequiredString(mapping.chassisNumber, "inventoryColumnMapping.chassisNumber"),
  };
}

function normalizeHeaderRow(value: unknown): number {
  if (value === undefined || value === null) {
    return 1;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError("headerRow must be a positive integer.");
  }
  return value;
}

function hasWorkbookSource(url?: string, driveId?: string, itemId?: string): boolean {
  if (typeof url === "string" && url.trim().length > 0) {
    return true;
  }
  return (
    typeof driveId === "string" &&
    driveId.trim().length > 0 &&
    typeof itemId === "string" &&
    itemId.trim().length > 0
  );
}

export function validateScanFolderInput(input: unknown): OperationalFolderScanRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Folder scan payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    folder: normalizeRequiredString(payload.folder, "folder"),
  };
}

export function validateLoadWorksheetsInput(input: unknown): WorkbookWorksheetsRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Worksheet load payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    folder: normalizeRequiredString(payload.folder, "folder"),
    workbook: normalizeRequiredString(payload.workbook, "workbook"),
  };
}

export function validateOperationalDataInput(input: unknown): ValidateOperationalDataRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Operational data payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    operationalDataFolder: normalizeRequiredString(payload.operationalDataFolder, "operationalDataFolder"),
    masterWorkbook: normalizeRequiredString(payload.masterWorkbook, "masterWorkbook"),
    masterWorksheet: normalizeOptionalString(payload.masterWorksheet, "masterWorksheet"),
    inventoryWorkbook: normalizeRequiredString(payload.inventoryWorkbook, "inventoryWorkbook"),
    inventoryWorksheet: normalizeOptionalString(payload.inventoryWorksheet, "inventoryWorksheet"),
    masterColumnMapping: payload.masterColumnMapping as Partial<MasterColumnMappingDto> | undefined,
    inventoryColumnMapping: payload.inventoryColumnMapping as Partial<InventoryColumnMappingDto> | undefined,
  };
}

export function validateUpdateOperationalDataInput(input: unknown): UpdateOperationalDataSettingsDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Operational data payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const base = validateOperationalDataInput(payload);
  return {
    operationalDataFolder: base.operationalDataFolder,
    masterWorkbook: base.masterWorkbook,
    masterWorksheet: normalizeRequiredString(base.masterWorksheet, "masterWorksheet"),
    inventoryWorkbook: base.inventoryWorkbook,
    inventoryWorksheet: normalizeRequiredString(base.inventoryWorksheet, "inventoryWorksheet"),
    masterWorkbookUrl: normalizeOptionalString(payload.masterWorkbookUrl, "masterWorkbookUrl"),
    inventoryWorkbookUrl: normalizeOptionalString(payload.inventoryWorkbookUrl, "inventoryWorkbookUrl"),
    relationshipMasterColumn: normalizeOptionalString(payload.relationshipMasterColumn, "relationshipMasterColumn"),
    relationshipInventoryColumn: normalizeOptionalString(
      payload.relationshipInventoryColumn,
      "relationshipInventoryColumn"
    ),
    headerRow: normalizeHeaderRow(payload.headerRow),
    autoDetectedMappings:
      payload.autoDetectedMappings === undefined ? undefined : normalizeObject(payload.autoDetectedMappings, "autoDetectedMappings"),
    manualMappings: payload.manualMappings === undefined ? undefined : normalizeObject(payload.manualMappings, "manualMappings"),
    masterColumnMapping: normalizeMasterMapping(payload.masterColumnMapping),
    inventoryColumnMapping: normalizeInventoryMapping(payload.inventoryColumnMapping),
    autoSyncEnabled: normalizeBoolean(payload.autoSyncEnabled, "autoSyncEnabled"),
    syncFrequency: normalizeFrequency(payload.syncFrequency),
    masterDriveId: normalizeOptionalString(payload.masterDriveId, "masterDriveId"),
    masterItemId: normalizeOptionalString(payload.masterItemId, "masterItemId"),
    inventoryDriveId: normalizeOptionalString(payload.inventoryDriveId, "inventoryDriveId"),
    inventoryItemId: normalizeOptionalString(payload.inventoryItemId, "inventoryItemId"),
  };
}

export function validateWorkbookUrlsInput(input: unknown): ValidateWorkbookUrlsRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workbook validation payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const masterWorkbookUrl = normalizeOptionalString(payload.masterWorkbookUrl, "masterWorkbookUrl");
  const inventoryWorkbookUrl = normalizeOptionalString(payload.inventoryWorkbookUrl, "inventoryWorkbookUrl");
  const masterDriveId = normalizeOptionalString(payload.masterDriveId, "masterDriveId");
  const masterItemId = normalizeOptionalString(payload.masterItemId, "masterItemId");
  const inventoryDriveId = normalizeOptionalString(payload.inventoryDriveId, "inventoryDriveId");
  const inventoryItemId = normalizeOptionalString(payload.inventoryItemId, "inventoryItemId");

  if (!hasWorkbookSource(masterWorkbookUrl, masterDriveId, masterItemId)) {
    throw new ValidationError(
      "Master workbook source is required. Provide masterWorkbookUrl or masterDriveId + masterItemId."
    );
  }
  if (!hasWorkbookSource(inventoryWorkbookUrl, inventoryDriveId, inventoryItemId)) {
    throw new ValidationError(
      "Inventory workbook source is required. Provide inventoryWorkbookUrl or inventoryDriveId + inventoryItemId."
    );
  }

  return {
    masterWorkbookUrl,
    inventoryWorkbookUrl,
    masterDriveId,
    masterItemId,
    inventoryDriveId,
    inventoryItemId,
  };
}

export function validateWorkbookHeadersInput(input: unknown): LoadWorkbookHeadersRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Workbook headers payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const masterWorkbookUrl = normalizeOptionalString(payload.masterWorkbookUrl, "masterWorkbookUrl");
  const inventoryWorkbookUrl = normalizeOptionalString(payload.inventoryWorkbookUrl, "inventoryWorkbookUrl");
  const masterDriveId = normalizeOptionalString(payload.masterDriveId, "masterDriveId");
  const masterItemId = normalizeOptionalString(payload.masterItemId, "masterItemId");
  const inventoryDriveId = normalizeOptionalString(payload.inventoryDriveId, "inventoryDriveId");
  const inventoryItemId = normalizeOptionalString(payload.inventoryItemId, "inventoryItemId");

  if (!hasWorkbookSource(masterWorkbookUrl, masterDriveId, masterItemId)) {
    throw new ValidationError(
      "Master workbook source is required. Provide masterWorkbookUrl or masterDriveId + masterItemId."
    );
  }
  if (!hasWorkbookSource(inventoryWorkbookUrl, inventoryDriveId, inventoryItemId)) {
    throw new ValidationError(
      "Inventory workbook source is required. Provide inventoryWorkbookUrl or inventoryDriveId + inventoryItemId."
    );
  }

  return {
    masterWorkbookUrl,
    inventoryWorkbookUrl,
    masterDriveId,
    masterItemId,
    inventoryDriveId,
    inventoryItemId,
    masterWorksheet: normalizeRequiredString(payload.masterWorksheet, "masterWorksheet"),
    inventoryWorksheet: normalizeRequiredString(payload.inventoryWorksheet, "inventoryWorksheet"),
    headerRow: normalizeHeaderRow(payload.headerRow),
  };
}

export function validateDetectMappingsInput(input: unknown): DetectMappingSuggestionsRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Mapping suggestion payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    masterHeaders: normalizeArrayOfString(payload.masterHeaders, "masterHeaders"),
    inventoryHeaders: normalizeArrayOfString(payload.inventoryHeaders, "inventoryHeaders"),
  };
}

export function validatePreviewConfigurationInput(input: unknown): PreviewOperationalConfigurationRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Preview payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const masterWorkbookUrl = normalizeOptionalString(payload.masterWorkbookUrl, "masterWorkbookUrl");
  const inventoryWorkbookUrl = normalizeOptionalString(payload.inventoryWorkbookUrl, "inventoryWorkbookUrl");
  const masterDriveId = normalizeOptionalString(payload.masterDriveId, "masterDriveId");
  const masterItemId = normalizeOptionalString(payload.masterItemId, "masterItemId");
  const inventoryDriveId = normalizeOptionalString(payload.inventoryDriveId, "inventoryDriveId");
  const inventoryItemId = normalizeOptionalString(payload.inventoryItemId, "inventoryItemId");

  if (!hasWorkbookSource(masterWorkbookUrl, masterDriveId, masterItemId)) {
    throw new ValidationError(
      "Master workbook source is required. Provide masterWorkbookUrl or masterDriveId + masterItemId."
    );
  }
  if (!hasWorkbookSource(inventoryWorkbookUrl, inventoryDriveId, inventoryItemId)) {
    throw new ValidationError(
      "Inventory workbook source is required. Provide inventoryWorkbookUrl or inventoryDriveId + inventoryItemId."
    );
  }

  return {
    masterWorkbookUrl,
    inventoryWorkbookUrl,
    masterDriveId,
    masterItemId,
    inventoryDriveId,
    inventoryItemId,
    masterWorksheet: normalizeRequiredString(payload.masterWorksheet, "masterWorksheet"),
    inventoryWorksheet: normalizeRequiredString(payload.inventoryWorksheet, "inventoryWorksheet"),
    relationshipMasterColumn: normalizeRequiredString(payload.relationshipMasterColumn, "relationshipMasterColumn"),
    relationshipInventoryColumn: normalizeRequiredString(payload.relationshipInventoryColumn, "relationshipInventoryColumn"),
    headerRow: normalizeHeaderRow(payload.headerRow),
  };
}

export function validateSaveWizardConfigurationInput(input: unknown): SaveOperationalWizardConfigurationDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Operational data wizard payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const masterWorkbookUrl = normalizeOptionalString(payload.masterWorkbookUrl, "masterWorkbookUrl");
  const inventoryWorkbookUrl = normalizeOptionalString(payload.inventoryWorkbookUrl, "inventoryWorkbookUrl");
  const masterDriveId = normalizeOptionalString(payload.masterDriveId, "masterDriveId");
  const masterItemId = normalizeOptionalString(payload.masterItemId, "masterItemId");
  const inventoryDriveId = normalizeOptionalString(payload.inventoryDriveId, "inventoryDriveId");
  const inventoryItemId = normalizeOptionalString(payload.inventoryItemId, "inventoryItemId");

  if (!hasWorkbookSource(masterWorkbookUrl, masterDriveId, masterItemId)) {
    throw new ValidationError(
      "Master workbook source is required. Provide masterWorkbookUrl or masterDriveId + masterItemId."
    );
  }
  if (!hasWorkbookSource(inventoryWorkbookUrl, inventoryDriveId, inventoryItemId)) {
    throw new ValidationError(
      "Inventory workbook source is required. Provide inventoryWorkbookUrl or inventoryDriveId + inventoryItemId."
    );
  }

  return {
    masterWorkbookUrl,
    inventoryWorkbookUrl,
    masterWorksheet: normalizeRequiredString(payload.masterWorksheet, "masterWorksheet"),
    inventoryWorksheet: normalizeRequiredString(payload.inventoryWorksheet, "inventoryWorksheet"),
    relationshipMasterColumn: normalizeRequiredString(payload.relationshipMasterColumn, "relationshipMasterColumn"),
    relationshipInventoryColumn: normalizeRequiredString(payload.relationshipInventoryColumn, "relationshipInventoryColumn"),
    headerRow: normalizeHeaderRow(payload.headerRow),
    autoDetectedMappings: normalizeObject(payload.autoDetectedMappings, "autoDetectedMappings"),
    manualMappings: normalizeObject(payload.manualMappings, "manualMappings"),
    masterColumnMapping: normalizeMasterMapping(payload.masterColumnMapping),
    inventoryColumnMapping: normalizeInventoryMapping(payload.inventoryColumnMapping),
    autoSyncEnabled: normalizeBoolean(payload.autoSyncEnabled, "autoSyncEnabled"),
    syncFrequency: normalizeFrequency(payload.syncFrequency),
    masterDriveId,
    masterItemId,
    inventoryDriveId,
    inventoryItemId,
  };
}

export function validateGraphAuthExchangeInput(input: unknown): GraphAuthExchangeRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Graph auth payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    code: normalizeRequiredString(payload.code, "code"),
  };
}

export function validateBrowseOneDriveItemsInput(input: unknown): BrowseOneDriveItemsRequestDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("OneDrive browsing payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  return {
    driveId: normalizeRequiredString(payload.driveId, "driveId"),
    parentItemId: normalizeOptionalString(payload.parentItemId, "parentItemId"),
  };
}
