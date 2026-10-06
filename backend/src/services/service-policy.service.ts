import { ConflictError, NotFoundError } from "../errors";
import { prismaClient } from "../database";
import { auditLogService } from "./audit-log.service";
import { ServicePolicyRepository } from "../repositories/service-policy.repository";
import type {
  CreatePriorityDefinitionDto,
  DefaultPriorityRuleDto,
  PriorityDefinitionDto,
  ServicePolicyVersionDto,
  SlaStatusRuleDto,
  StageSlaTargetDto,
  UpdatePriorityDefinitionDto,
  UpdateSlaStatusRuleDto,
  UpdateStageSlaTargetDto,
  UpdateWorkshopSlaTargetDto,
  UpsertDefaultPriorityRuleDto,
  WorkshopSlaTargetDto,
} from "../dto/service-policy.dto";

export interface ServicePolicyActor {
  userId: string;
  role: string;
}

const SNAPSHOT_CACHE_TTL_MS = 60_000;

export class ServicePolicyService {
  private snapshotCache: { value: Awaited<ReturnType<ServicePolicyRepository["getActivePolicySnapshot"]>>; expiresAt: number } | null = null;

  constructor(private readonly repository = new ServicePolicyRepository(prismaClient)) {}

  async listPriorityDefinitions(): Promise<PriorityDefinitionDto[]> {
    return (await this.repository.listPriorityDefinitions()).map(toPriorityDefinitionDto);
  }

  async createPriorityDefinition(actor: ServicePolicyActor, input: CreatePriorityDefinitionDto): Promise<PriorityDefinitionDto> {
    if (await this.repository.findPriorityDefinitionByCode(input.code)) {
      throw new ConflictError(`Priority code ${input.code} already exists.`);
    }
    const created = await this.repository.createPriorityDefinition(input);
    await this.audit(actor, "PriorityDefinition", created.id, "CREATED", null, created);
    await this.repository.bumpVersion(actor.userId);
    this.invalidateSnapshotCache();
    return toPriorityDefinitionDto(created);
  }

  async updatePriorityDefinition(actor: ServicePolicyActor, id: string, input: UpdatePriorityDefinitionDto): Promise<PriorityDefinitionDto> {
    const existing = await this.repository.findPriorityDefinition(id);
    if (!existing) throw new NotFoundError("Priority was not found.");
    const updated = await this.repository.updatePriorityDefinition(id, input);
    await this.audit(actor, "PriorityDefinition", id, "UPDATED", existing, updated);
    await this.repository.bumpVersion(actor.userId);
    this.invalidateSnapshotCache();
    return toPriorityDefinitionDto(updated);
  }

  async listDefaultPriorityRules(): Promise<DefaultPriorityRuleDto[]> {
    return (await this.repository.listDefaultPriorityRules()).map(toDefaultPriorityRuleDto);
  }

  async updateDefaultPriorityRule(actor: ServicePolicyActor, id: string, input: UpsertDefaultPriorityRuleDto): Promise<DefaultPriorityRuleDto> {
    const existing = await this.repository.findDefaultPriorityRule(id);
    if (!existing) throw new NotFoundError("Default priority rule was not found.");
    if (!(await this.repository.findPriorityDefinition(input.priorityDefinitionId))) {
      throw new NotFoundError("Priority was not found.");
    }
    const updated = await this.repository.updateDefaultPriorityRule(id, input);
    await this.audit(actor, "DefaultPriorityRule", id, "UPDATED", existing, updated);
    await this.repository.bumpVersion(actor.userId);
    this.invalidateSnapshotCache();
    return toDefaultPriorityRuleDto(updated);
  }

  async listWorkshopSlaTargets(): Promise<WorkshopSlaTargetDto[]> {
    return (await this.repository.listWorkshopSlaTargets()).map(toWorkshopSlaTargetDto);
  }

  async updateWorkshopSlaTarget(actor: ServicePolicyActor, id: string, input: UpdateWorkshopSlaTargetDto): Promise<WorkshopSlaTargetDto> {
    const existing = await this.repository.findWorkshopSlaTarget(id);
    if (!existing) throw new NotFoundError("Workshop SLA target was not found.");
    const updated = await this.repository.updateWorkshopSlaTarget(id, input);
    await this.audit(actor, "WorkshopSlaTarget", id, "UPDATED", existing, updated);
    await this.repository.bumpVersion(actor.userId);
    this.invalidateSnapshotCache();
    return toWorkshopSlaTargetDto(updated);
  }

  async listStageSlaTargets(): Promise<StageSlaTargetDto[]> {
    return (await this.repository.listStageSlaTargets()).map(toStageSlaTargetDto);
  }

  async updateStageSlaTarget(actor: ServicePolicyActor, id: string, input: UpdateStageSlaTargetDto): Promise<StageSlaTargetDto> {
    const existing = await this.repository.findStageSlaTarget(id);
    if (!existing) throw new NotFoundError("Stage SLA target was not found.");
    const updated = await this.repository.updateStageSlaTarget(id, input);
    await this.audit(actor, "StageSlaTarget", id, "UPDATED", existing, updated);
    await this.repository.bumpVersion(actor.userId);
    this.invalidateSnapshotCache();
    return toStageSlaTargetDto(updated);
  }

  async getSlaStatusRule(): Promise<SlaStatusRuleDto> {
    const rule = await this.repository.getSlaStatusRule();
    if (!rule) throw new NotFoundError("SLA status rule was not found.");
    return { id: rule.id, atRiskThresholdPct: rule.atRiskThresholdPct };
  }

  async updateSlaStatusRule(actor: ServicePolicyActor, input: UpdateSlaStatusRuleDto): Promise<SlaStatusRuleDto> {
    const existing = await this.repository.getSlaStatusRule();
    if (!existing) throw new NotFoundError("SLA status rule was not found.");
    const updated = await this.repository.updateSlaStatusRule(existing.id, input);
    await this.audit(actor, "SlaStatusRule", existing.id, "UPDATED", existing, updated);
    await this.repository.bumpVersion(actor.userId);
    this.invalidateSnapshotCache();
    return { id: updated.id, atRiskThresholdPct: updated.atRiskThresholdPct };
  }

  async listServicePolicyVersions(): Promise<ServicePolicyVersionDto[]> {
    const rows = await this.repository.listServicePolicyVersions();
    return rows.map((row) => ({
      id: row.id,
      versionLabel: row.versionLabel,
      effectiveFrom: row.effectiveFrom.toISOString(),
      isCurrent: row.isCurrent,
      createdByName: row.createdBy?.name ?? null,
    }));
  }

  /** Cached for SNAPSHOT_CACHE_TTL_MS since every ticket list/detail request needs this and the
   * underlying config rarely changes - same TTL-cache pattern used elsewhere in this codebase
   * (service-loss-analytics.service.ts) for similarly small, rarely-changing reference data. */
  async getActivePolicySnapshot() {
    if (this.snapshotCache && this.snapshotCache.expiresAt > Date.now()) {
      return this.snapshotCache.value;
    }
    const value = await this.repository.getActivePolicySnapshot();
    this.snapshotCache = { value, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS };
    return value;
  }

  private invalidateSnapshotCache(): void {
    this.snapshotCache = null;
  }

  private async audit(actor: ServicePolicyActor, entityType: string, entityId: string, action: string, before: unknown, after: unknown): Promise<void> {
    await auditLogService.record({
      entityType: `ServicePolicy.${entityType}`,
      entityId,
      action,
      performedById: actor.userId,
      performedByRole: actor.role,
      metadata: { before, after },
    });
  }
}

function toPriorityDefinitionDto(row: { id: string; code: string; legacyValue: string | null; displayName: string; colorHex: string; description: string | null; sortOrder: number; active: boolean }): PriorityDefinitionDto {
  return { id: row.id, code: row.code, legacyValue: row.legacyValue, displayName: row.displayName, colorHex: row.colorHex, description: row.description, sortOrder: row.sortOrder, active: row.active };
}
function toDefaultPriorityRuleDto(row: { id: string; condition: string; operator: string; value: string; priorityDefinitionId: string; active: boolean }): DefaultPriorityRuleDto {
  return { id: row.id, condition: row.condition, operator: row.operator, value: row.value, priorityDefinitionId: row.priorityDefinitionId, active: row.active };
}
function toWorkshopSlaTargetDto(row: { id: string; priorityDefinitionId: string; durationValue: number; durationUnit: string; active: boolean }): WorkshopSlaTargetDto {
  return { id: row.id, priorityDefinitionId: row.priorityDefinitionId, durationValue: row.durationValue, durationUnit: row.durationUnit, active: row.active };
}
function toStageSlaTargetDto(row: { id: string; stageKey: string; priorityDefinitionId: string; ownerRole: string; durationValue: number; durationUnit: string; active: boolean }): StageSlaTargetDto {
  return { id: row.id, stageKey: row.stageKey, priorityDefinitionId: row.priorityDefinitionId, ownerRole: row.ownerRole, durationValue: row.durationValue, durationUnit: row.durationUnit, active: row.active };
}

export const servicePolicyService = new ServicePolicyService();
