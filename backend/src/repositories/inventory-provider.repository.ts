import { prismaClient } from "../database";
import type { InventorySourceRecordDto } from "../dto/operational-provider.dto";
import type { OperationalDataSource } from "../datasources/operational-data.datasource";
import { PrismaOperationalDataSource } from "../datasources/prisma-operational-data.datasource";

export class InventoryProviderRepository {
  constructor(private readonly dataSource: OperationalDataSource = new PrismaOperationalDataSource(prismaClient)) {}

  async listVehicles(): Promise<InventorySourceRecordDto[]> {
    return this.dataSource.listInventoryRecords();
  }

  async findVehicleByMvTrack(mvTrackNumber: string): Promise<InventorySourceRecordDto | null> {
    const rows = await this.dataSource.findInventoryByMvTrack(mvTrackNumber);
    return rows[0] ?? null;
  }

  async findVehicleByVin(vin: string): Promise<InventorySourceRecordDto | null> {
    const rows = await this.dataSource.findInventoryByVin(vin);
    return rows[0] ?? null;
  }

  async findVehicleByNumber(vehicleNumber: string): Promise<InventorySourceRecordDto | null> {
    const rows = await this.dataSource.findInventoryByVehicleNumber(vehicleNumber);
    return rows[0] ?? null;
  }
}
