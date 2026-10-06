import type { InventoryColumnMappingDto, MasterColumnMappingDto } from "../dto/operational-data.dto";

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export class ExcelColumnMapperService {
  static normalizeHeader(value: string): string {
    return normalize(value);
  }

  static normalizeMasterMapping(mapping: MasterColumnMappingDto): MasterColumnMappingDto {
    return {
      customerName: normalize(mapping.customerName),
      phone: normalize(mapping.phone),
      hub: normalize(mapping.hub),
      vehicleNumber: normalize(mapping.vehicleNumber),
      mvTrackNumber: normalize(mapping.mvTrackNumber),
      plan: normalize(mapping.plan),
      rentalStatus: normalize(mapping.rentalStatus),
      deploymentDate: normalize(mapping.deploymentDate),
      returnDate: normalize(mapping.returnDate),
      coordinator: normalize(mapping.coordinator),
    };
  }

  static normalizeInventoryMapping(mapping: InventoryColumnMappingDto): InventoryColumnMappingDto {
    return {
      mvTrackNumber: normalize(mapping.mvTrackNumber),
      vehicleNumber: normalize(mapping.vehicleNumber),
      model: normalize(mapping.model),
      modelCode: normalize(mapping.modelCode),
      status: normalize(mapping.status),
      hub: normalize(mapping.hub),
      battery: normalize(mapping.battery),
      iotDevice: normalize(mapping.iotDevice),
      vin: normalize(mapping.vin),
      motorNumber: normalize(mapping.motorNumber),
      chassisNumber: normalize(mapping.chassisNumber),
    };
  }
}

