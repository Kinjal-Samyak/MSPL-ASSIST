import type { InventoryNsplSyncRowDto, MasterDeploymentSyncRowDto } from "../dto/excel-sync.dto";
import type {
  RowValidationIssue,
  RowValidationResult,
  ValidationService,
} from "../interfaces/excel-sync.interface";
import {
  normalizeIdentifier,
  normalizeOptionalText,
  normalizePhoneNumber,
  normalizeText,
  parseExcelDate,
} from "./excel-sync.normalization";

class ValidationCollector {
  readonly issues: RowValidationIssue[] = [];

  required(value: string, column: string, maxLength = 120): string {
    const normalized = normalizeText(value);
    if (!normalized) {
      this.issues.push({ column, reason: "is required" });
    } else if (normalized.length > maxLength) {
      this.issues.push({ column, reason: `cannot exceed ${maxLength} characters` });
    }
    return normalized;
  }

  optional(value: string | null, column: string, maxLength = 120): string | null {
    const normalized = normalizeOptionalText(value);
    if (normalized && normalized.length > maxLength) {
      this.issues.push({ column, reason: `cannot exceed ${maxLength} characters` });
    }
    return normalized;
  }

  date(value: string, column: string, required: boolean): string {
    if (!normalizeText(value)) {
      if (required) this.issues.push({ column, reason: "is required" });
      return "";
    }
    const parsed = parseExcelDate(value);
    if (!parsed) {
      this.issues.push({ column, reason: "must be a valid date" });
      return value;
    }
    return parsed.toISOString();
  }
}

function result<T>(value: T, collector: ValidationCollector): RowValidationResult<T> {
  return { value: collector.issues.length === 0 ? value : null, issues: collector.issues };
}

export class ExcelSyncValidationService implements ValidationService {
  validateMasterDeploymentRow(input: MasterDeploymentSyncRowDto): RowValidationResult<MasterDeploymentSyncRowDto> {
    const validation = new ValidationCollector();
    const phone = normalizePhoneNumber(input.phone);
    const returnDate = validation.optional(input.returnDate, "returnDate", 100);
    const deploymentDate = parseExcelDate(input.deploymentDate);
    const parsedReturnDate = returnDate ? parseExcelDate(returnDate) : null;
    const normalized: MasterDeploymentSyncRowDto = {
      ...input,
      rider: normalizeText(input.rider),
      phone,
      hub: normalizeText(input.hub),
      vehicle: normalizeIdentifier(input.vehicle),
      mvTrackNumber: normalizeIdentifier(input.mvTrackNumber),
      plan: normalizeText(input.plan),
      status: normalizeIdentifier(input.status),
      deploymentDate: deploymentDate?.toISOString() ?? normalizeText(input.deploymentDate),
      returnDate: parsedReturnDate?.toISOString() ?? returnDate,
      coordinator: normalizeText(input.coordinator),
      paidStatus: validation.optional(input.paidStatus, "paidStatus"),
      fddStatus: validation.optional(input.fddStatus, "fddStatus"),
    };
    return result(normalized, validation);
  }

  validateInventoryNsplRow(input: InventoryNsplSyncRowDto): RowValidationResult<InventoryNsplSyncRowDto> {
    const validation = new ValidationCollector();
    const vin = validation.optional(input.vin, "vin", 60);
    if (vin && !/^[A-Z0-9-]+$/i.test(vin)) {
      validation.issues.push({ column: "vin", reason: "must be alphanumeric" });
    }
    const motorNumber = validation.optional(input.motorNumber, "motorNumber");
    if (!motorNumber) {
      validation.issues.push({ column: "motorNumber", reason: "is required" });
    }
    const normalized: InventoryNsplSyncRowDto = {
      ...input,
      mvTrackNumber: normalizeIdentifier(validation.required(input.mvTrackNumber, "mvTrackNumber")),
      model: validation.required(input.model, "vehicle"),
      modelCode: normalizeIdentifier(input.modelCode) || normalizeIdentifier(input.model),
      vehicleStatus: validation.required(input.vehicleStatus, "status", 60).toUpperCase(),
      hub: normalizeText(input.hub),
      batteryNumber: validation.optional(input.batteryNumber, "batteryNumber"),
      chargerNumber: validation.optional(input.chargerNumber ?? null, "chargerNumber"),
      iotDevice: validation.optional(input.iotDevice, "iotDevice"),
      vin: vin?.toUpperCase() ?? null,
      motorNumber: motorNumber ? normalizeIdentifier(motorNumber) : null,
      chassisNumber: validation.optional(input.chassisNumber, "chassisNumber"),
    };
    return result(normalized, validation);
  }
}
