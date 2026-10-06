import type { Deployment, PrismaClient } from "@prisma/client";
import type {
  DeploymentSourceRecordDto,
  InventorySourceRecordDto,
  LookupHubSourceRecordDto,
  LookupIssueCategorySourceRecordDto,
  LookupPlanSourceRecordDto,
  LookupStatusSourceRecordDto,
  LookupTechnicianSourceRecordDto,
  LookupVehicleModelSourceRecordDto,
} from "../dto/operational-provider.dto";
import type { OperationalDataSource } from "./operational-data.datasource";

const CLOSED_TICKET_STATUSES = ["Closed", "Cancelled"];

type DeploymentWithRelations = Deployment & {
  customer: {
    id: string;
    name: string;
    registeredMobile: string;
  };
  hub: {
    id: string;
    name: string;
  };
  vehicleModel: {
    modelCode: string;
    displayName: string;
    manufacturer: string;
  };
};

type TechnicianWithRelations = {
  id: string;
  name: string;
  mobile: string;
  tickets: Array<{
    deployment: {
      hub: {
        name: string;
      } | null;
    } | null;
  }>;
};

export class PrismaOperationalDataSource implements OperationalDataSource {
  constructor(private readonly prisma: PrismaClient) {}

  async listInventoryRecords(): Promise<InventorySourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toInventorySourceRow(row));
  }

  async findInventoryByMvTrack(mvTrackNumber: string): Promise<InventorySourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      where: {
        mvTrackNumber: {
          equals: mvTrackNumber,
          mode: "insensitive",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toInventorySourceRow(row));
  }

  async findInventoryByVin(_vin: string): Promise<InventorySourceRecordDto[]> {
    return [];
  }

  async findInventoryByVehicleNumber(vehicleNumber: string): Promise<InventorySourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      where: {
        vehicleNumber: {
          equals: vehicleNumber,
          mode: "insensitive",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toInventorySourceRow(row));
  }

  async findDeploymentsByCustomerId(customerId: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toDeploymentSourceRow(row));
  }

  async findDeploymentsByMvTrack(mvTrackNumber: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      where: {
        mvTrackNumber: {
          equals: mvTrackNumber,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toDeploymentSourceRow(row));
  }

  async findDeploymentsByPhone(phone: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      where: {
        customer: {
          registeredMobile: {
            contains: phone,
            mode: "insensitive",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toDeploymentSourceRow(row));
  }

  async findDeploymentsByRiderName(name: string): Promise<DeploymentSourceRecordDto[]> {
    const rows = await this.prisma.deployment.findMany({
      where: {
        customer: {
          name: {
            contains: name,
            mode: "insensitive",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            registeredMobile: true,
          },
        },
        hub: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicleModel: {
          select: {
            modelCode: true,
            displayName: true,
            manufacturer: true,
          },
        },
      },
    });

    return rows.map((row) => this.toDeploymentSourceRow(row));
  }

  async getLookupHubs(): Promise<LookupHubSourceRecordDto[]> {
    const rows = await this.prisma.hub.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
    }));
  }

  async getLookupVehicleModels(): Promise<LookupVehicleModelSourceRecordDto[]> {
    const rows = await this.prisma.vehicleModel.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      orderBy: {
        displayName: "asc",
      },
      select: {
        id: true,
        modelCode: true,
        displayName: true,
        manufacturer: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      modelCode: row.modelCode,
      displayName: row.displayName,
      manufacturer: row.manufacturer,
    }));
  }

  async getLookupPlans(): Promise<LookupPlanSourceRecordDto[]> {
    return [];
  }

  async getLookupIssueCategories(issueCategoryId?: string): Promise<LookupIssueCategorySourceRecordDto[]> {
    const rows = await this.prisma.issueCategory.findMany({
      where: {
        active: true,
        deletedAt: null,
        id: issueCategoryId,
      },
      orderBy: {
        displayOrder: "asc",
      },
      select: {
        id: true,
        name: true,
        displayOrder: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayOrder: row.displayOrder,
    }));
  }

  async getLookupTechnicians(hub?: string): Promise<LookupTechnicianSourceRecordDto[]> {
    // A technician is eligible for initial assignment even before receiving a
    // first ticket. Prior ticket assignments therefore cannot be used as a
    // hub-membership filter. Hub is carried by the caller for context and
    // future UserHub-based routing, while all active technicians remain
    // selectable today.
    void hub;
    const rows = await this.prisma.user.findMany({
      where: {
        role: "TECHNICIAN",
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        tickets: {
          where: {
            status: {
              name: {
                notIn: CLOSED_TICKET_STATUSES,
              },
            },
          },
          select: {
            deployment: {
              select: {
                hub: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => this.toLookupTechnician(row));
  }

  async getLookupWorkshopStatuses(): Promise<LookupStatusSourceRecordDto[]> {
    const rows = await this.prisma.statusMaster.findMany({
      where: {
        active: true,
        deletedAt: null,
      },
      orderBy: {
        displayOrder: "asc",
      },
      select: {
        name: true,
      },
    });

    return rows.map((row) => ({
      code: row.name.toUpperCase().replace(/\s+/g, "_"),
      label: row.name,
    }));
  }

  async getLookupVehicleStatuses(): Promise<LookupStatusSourceRecordDto[]> {
    return [
      { code: "AVAILABLE", label: "Available" },
      { code: "DEPLOYED", label: "Deployed" },
      { code: "WORKSHOP", label: "Workshop" },
      { code: "RESERVED", label: "Reserved" },
      { code: "MAINTENANCE", label: "Maintenance" },
      { code: "INACTIVE", label: "Inactive" },
    ];
  }

  private toInventorySourceRow(row: DeploymentWithRelations): InventorySourceRecordDto {
    return {
      sourceId: row.id,
      mvTrackNumber: row.mvTrackNumber,
      vehicleNumber: row.vehicleNumber,
      registrationNumber: null,
      vin: null,
      chassisNumber: null,
      motorNumber: null,
      batteryNumber: row.mvTrackNumber,
      modelCode: row.vehicleModel.modelCode,
      modelName: row.vehicleModel.displayName,
      color: null,
      variant: null,
      manufacturer: row.vehicleModel.manufacturer,
      hubId: row.hub.id,
      hubName: row.hub.name,
      iotImei: null,
      iotSimNumber: null,
      ownership: null,
      purchaseDate: null,
      assetCost: null,
      warrantyExpiryDate: null,
      registrationExpiryDate: null,
      insuranceExpiryDate: null,
      fitnessExpiryDate: null,
      pucExpiryDate: null,
      fdd: null,
      currentCustomerId: row.customer.id,
      currentCustomerName: row.customer.name,
      currentCustomerPhone: row.customer.registeredMobile,
      rentalStatus: row.rentalStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDeploymentSourceRow(row: DeploymentWithRelations): DeploymentSourceRecordDto {
    return {
      deploymentId: row.id,
      customerId: row.customer.id,
      customerName: row.customer.name,
      customerPhone: row.customer.registeredMobile,
      vehicleNumber: row.vehicleNumber,
      mvTrackNumber: row.mvTrackNumber,
      rentalStatus: row.rentalStatus,
      hubId: row.hub.id,
      hubName: row.hub.name,
      modelName: row.vehicleModel.displayName,
      startedAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toLookupTechnician(row: TechnicianWithRelations): LookupTechnicianSourceRecordDto {
    return {
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      tickets: row.tickets,
    };
  }
}
