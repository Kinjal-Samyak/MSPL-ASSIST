import type { CustomerStatus, Prisma, PrismaClient, RentalStatus, Role } from "@prisma/client";
import type {
  CreateCustomerDto,
  CustomerDocumentQueryDto,
  CustomerListQueryDto,
  CustomerRentalHistoryQueryDto,
  UpdateCustomerDto,
} from "../dto/customer-module.dto";
import { SyncedOperationalDataSource } from "../datasources/synced-operational-data.datasource";

const CLOSED_STATUSES = ["Closed", "Cancelled"];
const ACTIVE_DEPLOYMENT_STATUSES: RentalStatus[] = ["ACTIVE", "PENDING"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CustomerListRow {
  id: string;
  name: string;
  registeredMobile: string;
  alternateMobile: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
  deployments: Array<{ id: string }>;
  tickets: Array<{ id: string }>;
}

export interface CustomerDetailRow {
  id: string;
  name: string;
  registeredMobile: string;
  alternateMobile: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  address: string | null;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
  deployments: Array<{ id: string; rentalStatus: RentalStatus }>;
  tickets: Array<{ id: string; status: { name: string } }>;
}

export interface CustomerTimelineRow {
  id: string;
  activityType: string;
  description: string;
  performedAt: Date;
  ticketId: string;
}

export interface CustomerRentalHistoryRow {
  id: string;
  vehicleNumber: string;
  mvTrackNumber: string;
  rentalStatus: RentalStatus;
  createdAt: Date;
  hub: { name: string };
  vehicleModel: { displayName: string };
}

export interface CustomerDocumentRow {
  id: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
  ticket: {
    id: string;
    ticketNumber: string;
  };
}

export class CustomerModuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findCurrentRiderStatusCounts(): Promise<Record<CustomerStatus, number>> {
    const metrics = await new SyncedOperationalDataSource(this.prisma).getMasterRiderAccountMetrics();
    return {
      ACTIVE: metrics.activeAccounts,
      INACTIVE: metrics.uniqueClosedAccounts,
      SUSPENDED: 0,
    };
  }

  private buildTechnicianScope(viewerRole?: Role, viewerUserId?: string): Prisma.CustomerWhereInput | undefined {
    if (viewerRole !== "TECHNICIAN" || !viewerUserId) {
      return undefined;
    }
    return {
      tickets: {
        some: {
          assignedToId: viewerUserId,
        },
      },
    };
  }

  async findCustomers(
    query: CustomerListQueryDto
  ): Promise<{
    items: CustomerListRow[];
    totalRecords: number;
    statusCounts: Record<CustomerStatus, number>;
  }> {
    const search = query.search?.trim();
    const technicianScope = this.buildTechnicianScope(query.viewerRole, query.viewerUserId);

    const searchFilters: Prisma.CustomerWhereInput[] = search
      ? [
          ...(UUID_PATTERN.test(search) ? [{ id: { equals: search } }] : []),
          { name: { contains: search, mode: "insensitive" } },
          { registeredMobile: { contains: search, mode: "insensitive" } },
          { alternateMobile: { contains: search, mode: "insensitive" } },
          { whatsAppNumber: { contains: search, mode: "insensitive" } },
        ]
      : [];

    const where: Prisma.CustomerWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(technicianScope ?? {}),
      ...(searchFilters.length > 0 ? { OR: searchFilters } : {}),
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [items, totalRecords, groupedStatuses] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy,
        select: {
          id: true,
          name: true,
          registeredMobile: true,
          alternateMobile: true,
          whatsAppNumber: true,
          email: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deployments: {
            where: {
              rentalStatus: {
                in: ACTIVE_DEPLOYMENT_STATUSES,
              },
            },
            select: {
              id: true,
            },
          },
          tickets: {
            where: {
              status: {
                name: {
                  notIn: CLOSED_STATUSES,
                },
              },
            },
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
      this.prisma.customer.groupBy({ by: ["status"], where, orderBy: { status: "asc" }, _count: { id: true } }),
    ]);

    const statusCounts: Record<CustomerStatus, number> = { ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 };
    const statusGroups = groupedStatuses as Array<{ status: CustomerStatus; _count: { id: number } }>;
    for (const group of statusGroups) {
      statusCounts[group.status] = group._count.id;
    }
    return { items, totalRecords, statusCounts };
  }

  async findCustomerById(
    customerId: string,
    viewerRole?: Role,
    viewerUserId?: string
  ): Promise<CustomerDetailRow | null> {
    const technicianScope = this.buildTechnicianScope(viewerRole, viewerUserId);
    return this.prisma.customer.findFirst({
      where: {
        id: customerId,
        ...(technicianScope ?? {}),
      },
      select: {
        id: true,
        name: true,
        registeredMobile: true,
        alternateMobile: true,
        whatsAppNumber: true,
        email: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deployments: {
          select: {
            id: true,
            rentalStatus: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findCustomerByMobile(registeredMobile: string): Promise<{ id: string } | null> {
    return this.prisma.customer.findFirst({
      where: { registeredMobile },
      select: { id: true },
    });
  }

  async createCustomer(payload: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        name: payload.customerName,
        registeredMobile: payload.registeredMobile,
        alternateMobile: payload.alternateMobile,
        whatsAppNumber: payload.whatsAppNumber,
        email: payload.email,
        address: payload.address,
      },
    });
  }

  async updateCustomer(customerId: string, payload: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: payload.customerName,
        registeredMobile: payload.registeredMobile,
        alternateMobile: payload.alternateMobile,
        whatsAppNumber: payload.whatsAppNumber,
        email: payload.email,
        address: payload.address,
        status: payload.status,
      },
    });
  }

  async findActiveDeploymentForCustomer(customerId: string): Promise<{ id: string } | null> {
    return this.prisma.deployment.findFirst({
      where: {
        customerId,
        rentalStatus: "ACTIVE",
      },
      select: { id: true },
    });
  }

  async findOpenTicketForCustomer(customerId: string): Promise<{ id: string } | null> {
    return this.prisma.ticket.findFirst({
      where: {
        customerId,
        status: {
          name: {
            notIn: CLOSED_STATUSES,
          },
        },
      },
      select: { id: true },
    });
  }

  async findCustomerTimeline(
    customerId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: CustomerTimelineRow[]; totalRecords: number }> {
    const where: Prisma.TicketActivityWhereInput = {
      ticket: {
        customerId,
      },
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketActivity.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          activityType: true,
          description: true,
          performedAt: true,
          ticketId: true,
        },
      }),
      this.prisma.ticketActivity.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findCustomerRentalHistory(
    customerId: string,
    query: CustomerRentalHistoryQueryDto
  ): Promise<{ items: CustomerRentalHistoryRow[]; totalRecords: number }> {
    const where: Prisma.DeploymentWhereInput = {
      customerId,
      ...(query.rentalStatus ? { rentalStatus: query.rentalStatus } : {}),
      ...(query.hub
        ? {
            hub: {
              name: {
                contains: query.hub,
                mode: "insensitive",
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                vehicleNumber: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
              {
                mvTrackNumber: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.deployment.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          vehicleNumber: true,
          mvTrackNumber: true,
          rentalStatus: true,
          createdAt: true,
          hub: {
            select: { name: true },
          },
          vehicleModel: {
            select: { displayName: true },
          },
        },
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return { items, totalRecords };
  }

  async findCustomerActiveVehicles(customerId: string): Promise<CustomerRentalHistoryRow[]> {
    return this.prisma.deployment.findMany({
      where: {
        customerId,
        rentalStatus: {
          in: ACTIVE_DEPLOYMENT_STATUSES,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        vehicleNumber: true,
        mvTrackNumber: true,
        rentalStatus: true,
        createdAt: true,
        hub: {
          select: { name: true },
        },
        vehicleModel: {
          select: { displayName: true },
        },
      },
    });
  }

  async findCustomerDocuments(
    customerId: string,
    query: CustomerDocumentQueryDto
  ): Promise<{ items: CustomerDocumentRow[]; totalRecords: number }> {
    const where: Prisma.TicketAttachmentWhereInput = {
      ticket: {
        customerId,
      },
      ...(query.fileType
        ? {
            fileType: {
              contains: query.fileType,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.ticketAttachment.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: {
          uploadedAt: "desc",
        },
        select: {
          id: true,
          fileUrl: true,
          fileType: true,
          uploadedAt: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
            },
          },
        },
      }),
      this.prisma.ticketAttachment.count({ where }),
    ]);

    return { items, totalRecords };
  }
}
