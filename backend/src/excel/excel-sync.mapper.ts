import type {
  InventoryNsplSyncRowDto,
  MasterDeploymentSyncRowDto,
  ParsedExcelRowDto,
} from "../dto/excel-sync.dto";
import type { InventoryColumnMappingDto, MasterColumnMappingDto } from "../dto/operational-data.dto";
import type { RowMapper } from "../interfaces/excel-sync.interface";
import { readCanonicalValue } from "./excel-header-normalizer";
import { normalizeOptionalText, normalizeText, toIsoDate } from "./excel-sync.normalization";

export class ExcelSyncRowMapper implements RowMapper {
  private readonly masterColumnMapping: MasterColumnMappingDto;
  private readonly inventoryColumnMapping: InventoryColumnMappingDto;

  constructor(input?: { masterColumnMapping?: MasterColumnMappingDto; inventoryColumnMapping?: InventoryColumnMappingDto }) {
    this.masterColumnMapping = input?.masterColumnMapping ?? {
      customerName: "customer name",
      phone: "phone",
      hub: "hub",
      vehicleNumber: "vehicle number",
      mvTrackNumber: "mv track number",
      plan: "plan",
      rentalStatus: "rental status",
      deploymentDate: "deployment date",
      returnDate: "return date",
      coordinator: "coordinator",
    };
    this.inventoryColumnMapping = input?.inventoryColumnMapping ?? {
      mvTrackNumber: "mv track number",
      vehicleNumber: "vehicle number",
      model: "model",
      modelCode: "model code",
      status: "status",
      hub: "hub",
      battery: "battery",
      iotDevice: "iot device",
      vin: "vin",
      motorNumber: "motor number",
      chassisNumber: "chassis number",
    };
  }

  mapMasterDeploymentRow(row: ParsedExcelRowDto): MasterDeploymentSyncRowDto {
    const read = (field: Parameters<typeof readCanonicalValue>[1], configured?: string): unknown =>
      readCanonicalValue(row.values, field, configured, "MASTER_DEPLOYMENT");
    return {
      rowNumber: row.rowNumber,
      rider: normalizeText(read("rider", this.masterColumnMapping.customerName)),
      phone: normalizeText(read("phone", this.masterColumnMapping.phone)),
      hub: normalizeText(read("hub", this.masterColumnMapping.hub)),
      vehicle: normalizeText(read("vehicle", this.masterColumnMapping.vehicleNumber)),
      mvTrackNumber: normalizeText(read("mvTrackNumber", this.masterColumnMapping.mvTrackNumber)),
      plan: normalizeText(read("plan", this.masterColumnMapping.plan)),
      status: normalizeText(read("status", this.masterColumnMapping.rentalStatus)),
      deploymentDate: toIsoDate(read("deploymentDate", this.masterColumnMapping.deploymentDate)),
      returnDate: normalizeOptionalText(read("returnDate", this.masterColumnMapping.returnDate)),
      coordinator: normalizeText(read("coordinator", this.masterColumnMapping.coordinator)),
      paidStatus: normalizeOptionalText(read("paidStatus")),
      fddStatus: normalizeOptionalText(read("fddStatus")),
      isLatestForRider: false,
    };
  }

  mapInventoryNsplRow(row: ParsedExcelRowDto): InventoryNsplSyncRowDto {
    const read = (field: Parameters<typeof readCanonicalValue>[1], configured?: string): unknown =>
      readCanonicalValue(row.values, field, configured, "INVENTORY_NSPL");
    const model = normalizeText(read("model", this.inventoryColumnMapping.model));
    return {
      rowNumber: row.rowNumber,
      mvTrackNumber: normalizeText(read("mvTrackNumber", this.inventoryColumnMapping.mvTrackNumber)),
      model,
      modelCode: normalizeText(read("modelCode", this.inventoryColumnMapping.modelCode)) || model,
      vehicleStatus: normalizeText(read("status", this.inventoryColumnMapping.status)),
      hub: normalizeText(read("hub", this.inventoryColumnMapping.hub)),
      batteryNumber: normalizeOptionalText(read("batteryNumber", this.inventoryColumnMapping.battery)),
      chargerNumber: normalizeOptionalText(read("chargerNumber")),
      iotDevice: normalizeOptionalText(read("iotDevice", this.inventoryColumnMapping.iotDevice)),
      vin: normalizeOptionalText(read("vin", this.inventoryColumnMapping.vin)),
      motorNumber: normalizeOptionalText(read("motorNumber", this.inventoryColumnMapping.motorNumber)),
      chassisNumber: normalizeOptionalText(read("chassisNumber", this.inventoryColumnMapping.chassisNumber)),
    };
  }
}
