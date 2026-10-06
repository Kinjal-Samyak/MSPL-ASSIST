import { createHash } from "node:crypto";
import type {
  InventoryColumnMappingDto,
  MasterColumnMappingDto,
  ValidateOperationalDataRequestDto,
  ValidateOperationalDataResponseDto,
} from "../dto/operational-data.dto";
import { ValidationError } from "../errors";
import { ExcelColumnMapperService } from "./excel-column-mapper.service";
import { ExcelMetadataReaderService } from "./excel-metadata-reader.service";
import { ExcelWorksheetReaderService } from "./excel-worksheet-reader.service";

function computeWorksheetHash(masterWorksheet: string, inventoryWorksheet: string): string {
  return createHash("sha256").update(`${masterWorksheet}|${inventoryWorksheet}`).digest("hex");
}

function detectDuplicateHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  for (const header of headers) {
    counts.set(header, (counts.get(header) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([header]) => header);
}

function missingHeaders(headers: string[], required: string[]): string[] {
  const available = new Set(headers);
  return required.filter((requiredHeader) => !available.has(requiredHeader));
}

export class ExcelValidatorService {
  constructor(
    private readonly metadataReader: ExcelMetadataReaderService = new ExcelMetadataReaderService(),
    private readonly worksheetReader: ExcelWorksheetReaderService = new ExcelWorksheetReaderService()
  ) {}

  validate(input: {
    payload: ValidateOperationalDataRequestDto;
    masterFilePath: string;
    inventoryFilePath: string;
    masterWorksheet: string;
    inventoryWorksheet: string;
    masterColumnMapping: MasterColumnMappingDto;
    inventoryColumnMapping: InventoryColumnMappingDto;
  }): ValidateOperationalDataResponseDto {
    const errors: string[] = [];
    const warnings: string[] = [];

    const masterWorksheets = this.metadataReader.listWorksheets(input.masterFilePath);
    const inventoryWorksheets = this.metadataReader.listWorksheets(input.inventoryFilePath);

    if (!masterWorksheets.includes(input.masterWorksheet)) {
      throw new ValidationError(
        `Configured worksheet no longer exists. Available worksheets: ${masterWorksheets.join(", ")}`
      );
    }
    if (!inventoryWorksheets.includes(input.inventoryWorksheet)) {
      throw new ValidationError(
        `Configured worksheet no longer exists. Available worksheets: ${inventoryWorksheets.join(", ")}`
      );
    }

    const masterHeaders = this.worksheetReader.readHeaders(input.masterFilePath, input.masterWorksheet);
    const inventoryHeaders = this.worksheetReader.readHeaders(input.inventoryFilePath, input.inventoryWorksheet);
    this.worksheetReader.ensureWorksheetNotEmpty(input.masterFilePath, input.masterWorksheet);
    this.worksheetReader.ensureWorksheetNotEmpty(input.inventoryFilePath, input.inventoryWorksheet);

    const duplicateMaster = detectDuplicateHeaders(masterHeaders);
    if (duplicateMaster.length > 0) {
      errors.push(`Duplicate header in master worksheet: ${duplicateMaster.join(", ")}`);
    }
    const duplicateInventory = detectDuplicateHeaders(inventoryHeaders);
    if (duplicateInventory.length > 0) {
      errors.push(`Duplicate header in inventory worksheet: ${duplicateInventory.join(", ")}`);
    }

    const normalizedMasterMapping = ExcelColumnMapperService.normalizeMasterMapping(input.masterColumnMapping);
    const normalizedInventoryMapping = ExcelColumnMapperService.normalizeInventoryMapping(input.inventoryColumnMapping);
    const missingMaster = missingHeaders(masterHeaders, Object.values(normalizedMasterMapping));
    if (missingMaster.length > 0) {
      errors.push(`Required column missing in master worksheet: ${missingMaster.join(", ")}`);
    }
    const missingInventory = missingHeaders(inventoryHeaders, Object.values(normalizedInventoryMapping));
    if (missingInventory.length > 0) {
      errors.push(`Required column missing in inventory worksheet: ${missingInventory.join(", ")}`);
    }

    const masterWorkbookHash = this.metadataReader.computeWorkbookHash(input.masterFilePath);
    const inventoryWorkbookHash = this.metadataReader.computeWorkbookHash(input.inventoryFilePath);
    if (masterWorkbookHash === inventoryWorkbookHash) {
      warnings.push("Master and Inventory workbook hashes are identical.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      resolvedMasterWorksheet: input.masterWorksheet,
      resolvedInventoryWorksheet: input.inventoryWorksheet,
      masterWorkbookHash,
      inventoryWorkbookHash,
    };
  }

  computeWorksheetHash(masterWorksheet: string, inventoryWorksheet: string): string {
    return computeWorksheetHash(masterWorksheet, inventoryWorksheet);
  }
}

