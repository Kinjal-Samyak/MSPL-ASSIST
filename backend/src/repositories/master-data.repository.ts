import type { Hub, IssueCategory, PrismaClient, StatusMaster, VehicleModel } from "@prisma/client";

export class MasterDataRepository {
  constructor(private prisma: PrismaClient) {}

  async getStatuses(): Promise<StatusMaster[]> {
    return this.prisma.statusMaster.findMany({
      where: {
        active: true,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });
  }

  async getIssueCategories(): Promise<IssueCategory[]> {
    return this.prisma.issueCategory.findMany({
      where: {
        active: true,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });
  }

  async getHubs(): Promise<Hub[]> {
    return this.prisma.hub.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getVehicleModels(): Promise<VehicleModel[]> {
    return this.prisma.vehicleModel.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      orderBy: {
        displayName: "asc",
      },
    });
  }
}
