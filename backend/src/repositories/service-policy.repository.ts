import type { PrismaClient } from "@prisma/client";
import type {
  CreatePriorityDefinitionDto,
  UpdatePriorityDefinitionDto,
  UpdateSlaStatusRuleDto,
  UpdateStageSlaTargetDto,
  UpdateWorkshopSlaTargetDto,
  UpsertDefaultPriorityRuleDto,
} from "../dto/service-policy.dto";

export class ServicePolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listPriorityDefinitions() {
    return this.prisma.priorityDefinition.findMany({ orderBy: { sortOrder: "asc" } });
  }
  findPriorityDefinition(id: string) {
    return this.prisma.priorityDefinition.findUnique({ where: { id } });
  }
  findPriorityDefinitionByCode(code: string) {
    return this.prisma.priorityDefinition.findUnique({ where: { code } });
  }
  createPriorityDefinition(data: CreatePriorityDefinitionDto) {
    return this.prisma.priorityDefinition.create({ data });
  }
  updatePriorityDefinition(id: string, data: UpdatePriorityDefinitionDto) {
    return this.prisma.priorityDefinition.update({ where: { id }, data });
  }

  listDefaultPriorityRules() {
    return this.prisma.defaultPriorityRule.findMany({ orderBy: { createdAt: "asc" } });
  }
  findDefaultPriorityRule(id: string) {
    return this.prisma.defaultPriorityRule.findUnique({ where: { id } });
  }
  createDefaultPriorityRule(data: UpsertDefaultPriorityRuleDto) {
    return this.prisma.defaultPriorityRule.create({ data });
  }
  updateDefaultPriorityRule(id: string, data: UpsertDefaultPriorityRuleDto) {
    return this.prisma.defaultPriorityRule.update({ where: { id }, data });
  }

  listWorkshopSlaTargets() {
    return this.prisma.workshopSlaTarget.findMany({ include: { priorityDefinition: true } });
  }
  findWorkshopSlaTarget(id: string) {
    return this.prisma.workshopSlaTarget.findUnique({ where: { id } });
  }
  updateWorkshopSlaTarget(id: string, data: UpdateWorkshopSlaTargetDto) {
    return this.prisma.workshopSlaTarget.update({ where: { id }, data });
  }

  listStageSlaTargets() {
    return this.prisma.stageSlaTarget.findMany({ include: { priorityDefinition: true }, orderBy: [{ stageKey: "asc" }] });
  }
  findStageSlaTarget(id: string) {
    return this.prisma.stageSlaTarget.findUnique({ where: { id } });
  }
  updateStageSlaTarget(id: string, data: UpdateStageSlaTargetDto) {
    return this.prisma.stageSlaTarget.update({ where: { id }, data });
  }

  getSlaStatusRule() {
    return this.prisma.slaStatusRule.findFirst();
  }
  updateSlaStatusRule(id: string, data: UpdateSlaStatusRuleDto) {
    return this.prisma.slaStatusRule.update({ where: { id }, data });
  }

  listServicePolicyVersions() {
    return this.prisma.servicePolicyVersion.findMany({
      orderBy: { effectiveFrom: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
  }

  /** Every Service Policy write calls this: flips the current version off and creates a new one,
   * giving the coarse (ticket-level) versioning the frozen spec asks for. */
  async bumpVersion(actorUserId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.servicePolicyVersion.findFirst({ where: { isCurrent: true } });
      const nextLabel = current ? incrementVersionLabel(current.versionLabel) : "v1.0";
      await tx.servicePolicyVersion.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
      await tx.servicePolicyVersion.create({ data: { versionLabel: nextLabel, createdById: actorUserId, isCurrent: true } });
    });
  }

  /** Everything the SLA engine needs to compute stage/workshop SLA status for any ticket, fetched
   * once per request and cached briefly by the service layer (same TTL-cache pattern already used
   * elsewhere in this codebase for similarly small, rarely-changing config reads). */
  async getActivePolicySnapshot() {
    const [priorityDefinitions, workshopSlaTargets, stageSlaTargets, slaStatusRule] = await this.prisma.$transaction([
      this.prisma.priorityDefinition.findMany({ where: { active: true } }),
      this.prisma.workshopSlaTarget.findMany({ where: { active: true } }),
      this.prisma.stageSlaTarget.findMany({ where: { active: true } }),
      this.prisma.slaStatusRule.findFirst(),
    ]);
    return { priorityDefinitions, workshopSlaTargets, stageSlaTargets, slaStatusRule };
  }
}

function incrementVersionLabel(label: string): string {
  const match = /^v(\d+)\.(\d+)$/.exec(label);
  if (!match) return "v1.1";
  const [, major, minor] = match;
  return `v${major}.${Number(minor) + 1}`;
}
