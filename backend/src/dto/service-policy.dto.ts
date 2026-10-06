export interface PriorityDefinitionDto {
  id: string;
  code: string;
  legacyValue: string | null;
  displayName: string;
  colorHex: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface CreatePriorityDefinitionDto {
  code: string;
  displayName: string;
  colorHex: string;
  description?: string;
  sortOrder: number;
}

export interface UpdatePriorityDefinitionDto {
  displayName?: string;
  colorHex?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface DefaultPriorityRuleDto {
  id: string;
  condition: string;
  operator: string;
  value: string;
  priorityDefinitionId: string;
  active: boolean;
}

export interface UpsertDefaultPriorityRuleDto {
  condition: string;
  operator: string;
  value: string;
  priorityDefinitionId: string;
  active?: boolean;
}

export interface WorkshopSlaTargetDto {
  id: string;
  priorityDefinitionId: string;
  durationValue: number;
  durationUnit: string;
  active: boolean;
}

export interface UpdateWorkshopSlaTargetDto {
  durationValue: number;
  durationUnit: string;
  active?: boolean;
}

export interface StageSlaTargetDto {
  id: string;
  stageKey: string;
  priorityDefinitionId: string;
  ownerRole: string;
  durationValue: number;
  durationUnit: string;
  active: boolean;
}

export interface UpdateStageSlaTargetDto {
  durationValue: number;
  durationUnit: string;
  active?: boolean;
}

export interface SlaStatusRuleDto {
  id: string;
  atRiskThresholdPct: number;
}

export interface UpdateSlaStatusRuleDto {
  atRiskThresholdPct: number;
}

export interface ServicePolicyVersionDto {
  id: string;
  versionLabel: string;
  effectiveFrom: string;
  isCurrent: boolean;
  createdByName: string | null;
}
