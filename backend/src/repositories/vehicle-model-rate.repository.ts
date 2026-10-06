import type { PrismaClient, VehicleModelRate } from "@prisma/client";

export class VehicleModelRateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listVehicleModelsWithCurrentRate() {
    return this.prisma.vehicleModel.findMany({
      where: { deletedAt: null },
      orderBy: { displayName: "asc" },
      include: {
        rentalRates: {
          where: { active: true, effectiveTo: null },
          take: 1,
        },
      },
    });
  }

  async findModel(vehicleModelId: string) {
    return this.prisma.vehicleModel.findUnique({ where: { id: vehicleModelId } });
  }

  async listRateHistory(vehicleModelId: string): Promise<VehicleModelRate[]> {
    return this.prisma.vehicleModelRate.findMany({
      where: { vehicleModelId },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  /** Closes the currently-open rate (if any) and inserts the new one, so history never overlaps. */
  async addRate(vehicleModelId: string, weeklyRental: number, dailyRental: number, effectiveFrom: Date): Promise<VehicleModelRate> {
    return this.prisma.$transaction(async (tx) => {
      const openRate = await tx.vehicleModelRate.findFirst({
        where: { vehicleModelId, active: true, effectiveTo: null },
      });
      if (openRate) {
        const dayBefore = new Date(effectiveFrom.getTime() - 24 * 60 * 60 * 1000);
        await tx.vehicleModelRate.update({
          where: { id: openRate.id },
          data: { effectiveTo: dayBefore },
        });
      }
      return tx.vehicleModelRate.create({
        data: { vehicleModelId, weeklyRental, dailyRental, effectiveFrom, active: true },
      });
    });
  }

  async updateSlaTarget(vehicleModelId: string, slaTargetDays: number) {
    return this.prisma.vehicleModel.update({
      where: { id: vehicleModelId },
      data: { slaTargetDays },
    });
  }

  /** Rate effective on the given date for the given model, or null if none configured yet. */
  async findRateEffectiveOn(vehicleModelId: string, date: Date): Promise<VehicleModelRate | null> {
    return this.prisma.vehicleModelRate.findFirst({
      where: {
        vehicleModelId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
  }
}
