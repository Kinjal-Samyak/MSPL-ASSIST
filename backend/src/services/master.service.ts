import { prismaClient } from "../database";
import { MasterDataRepository } from "../repositories/master-data.repository";
import type { Hub, IssueCategory, StatusMaster, VehicleModel } from "@prisma/client";

export class MasterService {
  private readonly repository: MasterDataRepository;

  constructor(repository?: MasterDataRepository) {
    this.repository = repository ?? new MasterDataRepository(prismaClient);
  }

  async getStatuses(): Promise<StatusMaster[]> {
    return this.repository.getStatuses();
  }

  async getIssueCategories(): Promise<IssueCategory[]> {
    return this.repository.getIssueCategories();
  }

  async getHubs(): Promise<Hub[]> {
    return this.repository.getHubs();
  }

  async getVehicleModels(): Promise<VehicleModel[]> {
    return this.repository.getVehicleModels();
  }
}
