import type {
  LookupHubDto,
  LookupIssueCategoryDto,
  LookupIssueSubCategoryDto,
  LookupModelCodeDto,
  LookupPlanDto,
  LookupTechnicianDto,
  LookupVehicleModelDto,
  LookupVehicleStatusDto,
  LookupWorkshopStatusDto,
} from "../dto/operational-provider.dto";
import type { LookupProvider } from "../interfaces/operational-providers.interface";
import { LookupProviderRepository } from "../repositories/lookup-provider.repository";
import { validateIssueSubcategoryQuery, validateTechnicianLookupQuery } from "../validators/lookup.validator";
import { LookupMapper } from "./lookup.mapper";
import { InMemoryTtlCache } from "./provider-cache";

const LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;

export class LookupProviderService implements LookupProvider {
  private readonly cache: InMemoryTtlCache;

  constructor(
    private readonly repository: LookupProviderRepository = new LookupProviderRepository(),
    cache?: InMemoryTtlCache
  ) {
    this.cache = cache ?? new InMemoryTtlCache();
  }

  async getHubs(): Promise<LookupHubDto[]> {
    return this.getCached("lookup:hubs", async () => {
      const rows = await this.repository.getHubs();
      return rows.map((row) => ({
        hubId: row.id,
        hubName: row.name,
        city: row.city,
        state: row.state,
      }));
    });
  }

  async getVehicleModels(): Promise<LookupVehicleModelDto[]> {
    return this.getCached("lookup:vehicle-models", async () => {
      const rows = await this.repository.getVehicleModels();
      return rows.map((row) => ({
        modelId: row.id,
        modelCode: row.modelCode,
        modelName: row.displayName,
        manufacturer: row.manufacturer,
      }));
    });
  }

  async getModelCodes(): Promise<LookupModelCodeDto[]> {
    return this.getCached("lookup:model-codes", async () => {
      const models = await this.getVehicleModels();
      return models.map((model) => ({
        modelCode: model.modelCode,
        modelName: model.modelName,
      }));
    });
  }

  async getPlans(): Promise<LookupPlanDto[]> {
    return this.getCached("lookup:plans", async () => {
      const rows = await this.repository.getPlans();
      return rows.map((row) => ({
        planCode: row.planCode,
        planName: row.planName,
        description: row.description,
        active: row.active,
      }));
    });
  }

  async getIssueCategories(): Promise<LookupIssueCategoryDto[]> {
    return this.getCached("lookup:issue-categories", async () => {
      const rows = await this.repository.getIssueCategories();
      return rows.map((row) => ({
        issueCategoryId: row.id,
        issueCategoryName: row.name,
        displayOrder: row.displayOrder,
      }));
    });
  }

  async getIssueSubCategories(issueCategoryId?: unknown): Promise<LookupIssueSubCategoryDto[]> {
    const query = validateIssueSubcategoryQuery({
      issueCategoryId,
    });
    const cacheKey = `lookup:issue-subcategories:${query.issueCategoryId ?? "all"}`;

    return this.getCached(cacheKey, async () => {
      const rows = await this.repository.getIssueCategories(query.issueCategoryId);
      return LookupMapper.toIssueSubcategories(rows);
    });
  }

  async getTechnicians(filters?: unknown): Promise<LookupTechnicianDto[]> {
    const query = validateTechnicianLookupQuery(filters ?? {});
    const rows = await this.repository.getTechnicians(query.hub);
    const mapped = LookupMapper.toTechnicianLookup(rows);
    if (!query.availability) {
      return mapped;
    }

    return mapped.filter((item) => item.availabilityStatus === query.availability);
  }

  async getWorkshopStatuses(): Promise<LookupWorkshopStatusDto[]> {
    return this.getCached("lookup:workshop-statuses", async () => {
      const rows = await this.repository.getWorkshopStatuses();
      return rows.map((row) => ({
        code: row.code,
        label: row.label,
      }));
    });
  }

  async getVehicleStatuses(): Promise<LookupVehicleStatusDto[]> {
    return this.getCached("lookup:vehicle-statuses", async () => {
      const rows = await this.repository.getVehicleStatuses();
      return rows.map((row) => ({
        code: row.code,
        label: row.label,
      }));
    });
  }

  private async getCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await loader();
    this.cache.set<T>(key, value, LOOKUP_CACHE_TTL_MS);
    return value;
  }
}

