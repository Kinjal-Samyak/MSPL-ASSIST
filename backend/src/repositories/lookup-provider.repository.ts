import { prismaClient } from "../database";
import type {
  LookupHubSourceRecordDto,
  LookupIssueCategorySourceRecordDto,
  LookupPlanSourceRecordDto,
  LookupStatusSourceRecordDto,
  LookupTechnicianSourceRecordDto,
  LookupVehicleModelSourceRecordDto,
} from "../dto/operational-provider.dto";
import type { OperationalDataSource } from "../datasources/operational-data.datasource";
import { PrismaOperationalDataSource } from "../datasources/prisma-operational-data.datasource";

export class LookupProviderRepository {
  constructor(private readonly dataSource: OperationalDataSource = new PrismaOperationalDataSource(prismaClient)) {}

  async getHubs(): Promise<LookupHubSourceRecordDto[]> {
    return this.dataSource.getLookupHubs();
  }

  async getVehicleModels(): Promise<LookupVehicleModelSourceRecordDto[]> {
    return this.dataSource.getLookupVehicleModels();
  }

  async getPlans(): Promise<LookupPlanSourceRecordDto[]> {
    return this.dataSource.getLookupPlans();
  }

  async getIssueCategories(issueCategoryId?: string): Promise<LookupIssueCategorySourceRecordDto[]> {
    return this.dataSource.getLookupIssueCategories(issueCategoryId);
  }

  async getTechnicians(hub?: string): Promise<LookupTechnicianSourceRecordDto[]> {
    return this.dataSource.getLookupTechnicians(hub);
  }

  async getWorkshopStatuses(): Promise<LookupStatusSourceRecordDto[]> {
    return this.dataSource.getLookupWorkshopStatuses();
  }

  async getVehicleStatuses(): Promise<LookupStatusSourceRecordDto[]> {
    return this.dataSource.getLookupVehicleStatuses();
  }
}

