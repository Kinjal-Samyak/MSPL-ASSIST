import { prismaClient } from "../database";
import type { DeploymentSourceRecordDto } from "../dto/operational-provider.dto";
import type { OperationalDataSource } from "../datasources/operational-data.datasource";
import { PrismaOperationalDataSource } from "../datasources/prisma-operational-data.datasource";

export class DeploymentProviderRepository {
  constructor(private readonly dataSource: OperationalDataSource = new PrismaOperationalDataSource(prismaClient)) {}

  async findDeploymentsByPhone(phone: string): Promise<DeploymentSourceRecordDto[]> {
    return this.dataSource.findDeploymentsByPhone(phone);
  }

  async findDeploymentsByRiderName(name: string): Promise<DeploymentSourceRecordDto[]> {
    return this.dataSource.findDeploymentsByRiderName(name);
  }

  async findDeploymentsByCustomerId(customerId: string): Promise<DeploymentSourceRecordDto[]> {
    return this.dataSource.findDeploymentsByCustomerId(customerId);
  }

  async findDeploymentsByMvTrack(mvTrackNumber: string): Promise<DeploymentSourceRecordDto[]> {
    return this.dataSource.findDeploymentsByMvTrack(mvTrackNumber);
  }
}
