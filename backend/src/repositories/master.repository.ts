import type {
  Customer,
  Deployment,
  IssueCategory,
  Prisma,
  StatusMaster,
  PrismaClient,
} from "@prisma/client";

function registeredMobileLookupValues(registeredMobile: string): string[] {
  const digits = registeredMobile.replace(/\D/g, '');
  const values = new Set<string>([digits]);
  if (digits.startsWith('91') && digits.length > 10) {
    values.add(digits.slice(2));
  } else if (digits.length === 10) {
    values.add(`91${digits}`);
  }
  return [...values];
}

export class MasterRepository {
  constructor(private prisma: PrismaClient) {}

  async findCustomerByRegisteredMobile(registeredMobile: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({
      where: {
        registeredMobile: { in: registeredMobileLookupValues(registeredMobile) },
      },
    });
  }

  async findIssueCategoryById(id: string): Promise<IssueCategory | null> {
    return this.prisma.issueCategory.findUnique({
      where: {
        id,
      },
    });
  }

  async findStatusByName(name: string): Promise<StatusMaster | null> {
    return this.prisma.statusMaster.findFirst({
      where: {
        name,
      },
    });
  }

  /**
   * Finds the first active deployment for a customer.
   *
   * A deployment is considered active if its rentalStatus is ACTIVE or PENDING.
   * Returns the deployment with all related vehicle and hub information.
   *
   * @param customerId - Customer UUID
   * @returns Deployment with related vehicleModel and hub, or null if not found
   */
  async findActiveDeploymentForCustomer(customerId: string): Promise<
    | (Deployment & {
        vehicleModel: { displayName: string; modelCode: string };
        hub: { name: string; id: string };
      })
    | null
  > {
    return this.prisma.deployment.findFirst({
      where: {
        customerId,
        rentalStatus: {
          in: ["ACTIVE", "PENDING"],
        },
      },
      include: {
        vehicleModel: {
          select: {
            displayName: true,
            modelCode: true,
          },
        },
        hub: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
  }

  async findDeploymentForCustomer(
    customerId: string,
    mvTrackNumber?: string,
    vehicleNumber?: string
  ): Promise<Deployment | null> {
    if (!mvTrackNumber && !vehicleNumber) {
      return null;
    }

    const conditions: Prisma.Enumerable<Prisma.DeploymentWhereInput> = [];

    if (mvTrackNumber) {
      conditions.push({ mvTrackNumber });
    }

    if (vehicleNumber) {
      conditions.push({ vehicleNumber });
    }

    return this.prisma.deployment.findFirst({
      where: {
        customerId,
        AND: conditions,
      },
    });
  }
}
