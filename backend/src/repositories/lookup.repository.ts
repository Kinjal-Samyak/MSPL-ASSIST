import type { Prisma, PrismaClient, RentalStatus } from "@prisma/client";
import type { CustomerSearchQueryDto, ServiceTlLookupDto, TechnicianLookupQueryDto } from "../dto/lookup.dto";

const activeRentalStatuses: RentalStatus[] = ["ACTIVE", "PENDING"];
const closedTicketStatuses = ["Closed", "Cancelled"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CustomerSearchRow {
  id: string;
  name: string;
  registeredMobile: string;
  deployments: Array<{
    hub: {
      name: string;
    };
  }>;
}

export interface CustomerVehicleRow {
  vehicleNumber: string;
  mvTrackNumber: string;
  rentalStatus: string;
  createdAt: Date;
  vehicleModel: {
    displayName: string;
  };
  hub: {
    name: string;
  };
}

export interface TechnicianLookupRow {
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
}

export interface IssueCategoryRow {
  id: string;
  name: string;
}

export class LookupRepository {
  constructor(private prisma: PrismaClient) {}

  async searchCustomers(
    query: CustomerSearchQueryDto
  ): Promise<{
    items: CustomerSearchRow[];
    totalRecords: number;
  }> {
    const searchConditions: Prisma.CustomerWhereInput[] = query.search
      ? [
          {
            name: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            registeredMobile: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            alternateMobile: {
              contains: query.search,
              mode: "insensitive",
            },
          },
          {
            whatsAppNumber: {
              contains: query.search,
              mode: "insensitive",
            },
          },
        ]
      : [];

    if (query.search && UUID_PATTERN.test(query.search)) {
      searchConditions.unshift({ id: { equals: query.search } });
    }

    const where: Prisma.CustomerWhereInput = searchConditions.length > 0
      ? { OR: searchConditions }
      : {};

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          registeredMobile: true,
          deployments: {
            where: {
              rentalStatus: {
                in: activeRentalStatuses,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              hub: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.customer.count({
        where,
      }),
    ]);

    return {
      items,
      totalRecords,
    };
  }

  async findCustomerById(customerId: string): Promise<{ id: string } | null> {
    return this.prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
      },
    });
  }

  async findCustomerActiveVehicles(customerId: string): Promise<CustomerVehicleRow[]> {
    return this.prisma.deployment.findMany({
      where: {
        customerId,
        rentalStatus: {
          in: activeRentalStatuses,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        vehicleNumber: true,
        mvTrackNumber: true,
        rentalStatus: true,
        createdAt: true,
        vehicleModel: {
          select: {
            displayName: true,
          },
        },
        hub: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async findTechnicians(query: TechnicianLookupQueryDto): Promise<TechnicianLookupRow[]> {
    // Technicians can be assigned to their first ticket. A hub query provides
    // assignment context, but must not require an earlier ticket assignment at
    // that hub because that would hide newly created technicians.
    void query.hub;

    return this.prisma.user.findMany({
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
                notIn: closedTicketStatuses,
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
  }

  async findServiceTls(): Promise<ServiceTlLookupDto[]> {
    return this.prisma.user.findMany({
      where: {
        role: "SERVICE_TL",
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findIssueCategories(issueCategoryId?: string): Promise<IssueCategoryRow[]> {
    return this.prisma.issueCategory.findMany({
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
      },
    });
  }
}
