import type {
  InventoryHubDto,
  InventoryIotDetailsDto,
  InventoryModelDto,
  InventorySourceRecordDto,
  InventoryVehicleDetailsDto,
  InventoryVehicleStatusDto,
  OperationalVehicleStatus,
} from "../dto/operational-provider.dto";
import type { InventoryProvider } from "../interfaces/operational-providers.interface";
import { InventoryProviderRepository } from "../repositories/inventory-provider.repository";
import {
  validateMvTrackNumber,
  validateVehicleNumber,
  validateVin,
} from "../validators/operational-provider.validator";

export class InventoryProviderService implements InventoryProvider {
  constructor(private readonly repository: InventoryProviderRepository = new InventoryProviderRepository()) {}

  async findVehicle(mvTrackNumber: unknown): Promise<InventoryVehicleDetailsDto | null> {
    return this.findVehicleByMvTrack(mvTrackNumber);
  }

  async findVehicleByMvTrack(mvTrackNumber: unknown): Promise<InventoryVehicleDetailsDto | null> {
    const normalizedMvTrack = validateMvTrackNumber(mvTrackNumber);
    const row = await this.repository.findVehicleByMvTrack(normalizedMvTrack);
    return row ? this.toVehicleDetails(row) : null;
  }

  async findVehicleByVehicleNumber(vehicleNumber: unknown): Promise<InventoryVehicleDetailsDto | null> {
    const normalizedVehicleNumber = validateVehicleNumber(vehicleNumber);
    const row = await this.repository.findVehicleByNumber(normalizedVehicleNumber);
    return row ? this.toVehicleDetails(row) : null;
  }

  async findVehicleByVin(vin: unknown): Promise<InventoryVehicleDetailsDto | null> {
    const normalizedVin = validateVin(vin);
    const row = await this.repository.findVehicleByVin(normalizedVin);
    return row ? this.toVehicleDetails(row) : null;
  }

  async getVehicleDetails(mvTrackNumber: unknown): Promise<InventoryVehicleDetailsDto | null> {
    return this.findVehicleByMvTrack(mvTrackNumber);
  }

  async listVehicles(): Promise<InventoryVehicleDetailsDto[]> {
    const rows = await this.repository.listVehicles();
    const byMvTrack = new Map<string, InventorySourceRecordDto>();

    for (const row of rows) {
      const existing = byMvTrack.get(row.mvTrackNumber);
      if (!existing) {
        byMvTrack.set(row.mvTrackNumber, row);
        continue;
      }

      const existingIsActive = existing.rentalStatus === "ACTIVE";
      const rowIsActive = row.rentalStatus === "ACTIVE";
      if (!existingIsActive && rowIsActive) {
        byMvTrack.set(row.mvTrackNumber, row);
      }
    }

    return Array.from(byMvTrack.values()).map((row) => this.toVehicleDetails(row));
  }

  async getVehicleStatus(mvTrackNumber: unknown): Promise<InventoryVehicleStatusDto | null> {
    const row = await this.findVehicleByMvTrack(mvTrackNumber);
    if (!row) {
      return null;
    }

    return {
      mvTrackNumber: row.mvTrackNumber,
      vehicleNumber: row.vehicleNumber,
      status: row.status,
      updatedAt: row.updatedAt,
    };
  }

  async getHub(mvTrackNumber: unknown): Promise<InventoryHubDto | null> {
    const row = await this.findVehicleByMvTrack(mvTrackNumber);
    return row?.hub ?? null;
  }

  async getModel(mvTrackNumber: unknown): Promise<InventoryModelDto | null> {
    const row = await this.findVehicleByMvTrack(mvTrackNumber);
    if (!row) {
      return null;
    }

    return {
      modelCode: row.modelCode,
      modelName: row.modelName,
      variant: row.variant,
      manufacturer: row.manufacturer,
    };
  }

  async getIotDetails(mvTrackNumber: unknown): Promise<InventoryIotDetailsDto | null> {
    const row = await this.findVehicleByMvTrack(mvTrackNumber);
    return row?.iot ?? null;
  }

  private toVehicleDetails(row: InventorySourceRecordDto): InventoryVehicleDetailsDto {
    return {
      mvTrackNumber: row.mvTrackNumber,
      vehicleNumber: row.vehicleNumber,
      registrationNumber: row.registrationNumber,
      vin: row.vin,
      chassisNumber: row.chassisNumber,
      motorNumber: row.motorNumber,
      batteryNumber: row.batteryNumber,
      modelCode: row.modelCode,
      modelName: row.modelName,
      color: row.color,
      variant: row.variant,
      manufacturer: row.manufacturer,
      hub: {
        hubId: row.hubId,
        hubName: row.hubName,
      },
      status: this.toOperationalVehicleStatus(row),
      ownership: row.ownership,
      purchaseDate: row.purchaseDate,
      assetCost: row.assetCost,
      warrantyExpiryDate: row.warrantyExpiryDate,
      registrationExpiryDate: row.registrationExpiryDate,
      insuranceExpiryDate: row.insuranceExpiryDate,
      fitnessExpiryDate: row.fitnessExpiryDate,
      pucExpiryDate: row.pucExpiryDate,
      fdd: row.fdd,
      currentCustomerId: row.currentCustomerId,
      currentCustomerName: row.currentCustomerName,
      currentCustomerPhone: row.currentCustomerPhone,
      iot: {
        imei: row.iotImei,
        simNumber: row.iotSimNumber,
      },
      updatedAt: row.updatedAt,
    };
  }

  private toOperationalVehicleStatus(row: InventorySourceRecordDto): OperationalVehicleStatus {
    if (row.rentalStatus === "ACTIVE" || row.rentalStatus === "PENDING") {
      return "DEPLOYED";
    }

    if (row.rentalStatus === "MAINTENANCE") {
      return "MAINTENANCE";
    }

    if (row.rentalStatus === "COMPLETED") {
      return "AVAILABLE";
    }

    return "UNKNOWN";
  }
}
