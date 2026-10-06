import { prismaClient } from "../database";
import type {
  CreateVehicleModelRateDto,
  UpdateSlaTargetDto,
  VehicleModelRateDto,
  VehicleModelWithRateDto,
} from "../dto/vehicle-model-rate.dto";
import { NotFoundError, ValidationError } from "../errors";
import { VehicleModelRateRepository } from "../repositories/vehicle-model-rate.repository";
import { computeDailyRental } from "../utils/service-loss";

function toRateDto(rate: { id: string; weeklyRental: unknown; dailyRental: unknown; effectiveFrom: Date; effectiveTo: Date | null; active: boolean }): VehicleModelRateDto {
  return {
    id: rate.id,
    weeklyRental: String(rate.weeklyRental),
    dailyRental: String(rate.dailyRental),
    effectiveFrom: rate.effectiveFrom.toISOString(),
    effectiveTo: rate.effectiveTo?.toISOString() ?? null,
    active: rate.active,
  };
}

function validateCreateRate(input: unknown): CreateVehicleModelRateDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("Rate payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const weeklyRental = Number(payload.weeklyRental);
  if (!Number.isFinite(weeklyRental) || weeklyRental <= 0) {
    throw new ValidationError("weeklyRental must be a positive number.");
  }
  const effectiveFrom = typeof payload.effectiveFrom === "string" ? payload.effectiveFrom : "";
  if (!effectiveFrom || Number.isNaN(new Date(effectiveFrom).getTime())) {
    throw new ValidationError("effectiveFrom must be a valid date.");
  }
  return { weeklyRental, effectiveFrom };
}

function validateSlaTarget(input: unknown): UpdateSlaTargetDto {
  if (input == null || typeof input !== "object") {
    throw new ValidationError("SLA target payload must be an object.");
  }
  const payload = input as Record<string, unknown>;
  const slaTargetDays = Number(payload.slaTargetDays);
  if (!Number.isInteger(slaTargetDays) || slaTargetDays <= 0) {
    throw new ValidationError("slaTargetDays must be a positive integer.");
  }
  return { slaTargetDays };
}

export class VehicleModelRateService {
  private readonly repository: VehicleModelRateRepository;

  constructor(repository?: VehicleModelRateRepository) {
    this.repository = repository ?? new VehicleModelRateRepository(prismaClient);
  }

  async listWithCurrentRate(): Promise<VehicleModelWithRateDto[]> {
    const models = await this.repository.listVehicleModelsWithCurrentRate();
    return models.map((model) => ({
      id: model.id,
      modelCode: model.modelCode,
      displayName: model.displayName,
      manufacturer: model.manufacturer,
      vehicleType: model.vehicleType,
      active: model.active,
      slaTargetDays: model.slaTargetDays,
      currentRate: model.rentalRates[0] ? toRateDto(model.rentalRates[0]) : null,
    }));
  }

  async listRateHistory(vehicleModelId: string): Promise<VehicleModelRateDto[]> {
    await this.assertModelExists(vehicleModelId);
    const rates = await this.repository.listRateHistory(vehicleModelId);
    return rates.map(toRateDto);
  }

  async addRate(vehicleModelId: string, input: unknown): Promise<VehicleModelRateDto> {
    await this.assertModelExists(vehicleModelId);
    const payload = validateCreateRate(input);
    const dailyRental = computeDailyRental(payload.weeklyRental);
    const created = await this.repository.addRate(vehicleModelId, payload.weeklyRental, dailyRental, new Date(payload.effectiveFrom));
    return toRateDto(created);
  }

  async updateSlaTarget(vehicleModelId: string, input: unknown): Promise<VehicleModelWithRateDto> {
    await this.assertModelExists(vehicleModelId);
    const payload = validateSlaTarget(input);
    await this.repository.updateSlaTarget(vehicleModelId, payload.slaTargetDays);
    const models = await this.listWithCurrentRate();
    const updated = models.find((model) => model.id === vehicleModelId);
    if (!updated) {
      throw new NotFoundError(`Vehicle Model with id ${vehicleModelId} was not found.`);
    }
    return updated;
  }

  private async assertModelExists(vehicleModelId: string): Promise<void> {
    const model = await this.repository.findModel(vehicleModelId);
    if (!model) {
      throw new NotFoundError(`Vehicle Model with id ${vehicleModelId} was not found.`);
    }
  }
}
