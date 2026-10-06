import apiClient from '@/api/apiClient';
import { unwrapApiData } from '@/services/apiService';
import { useAuthStore } from '@/store';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface PriorityDefinition {
  id: string;
  code: string;
  legacyValue: string | null;
  displayName: string;
  colorHex: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface CreatePriorityDefinitionPayload {
  code: string;
  displayName: string;
  colorHex: string;
  description?: string;
  sortOrder: number;
}

export interface UpdatePriorityDefinitionPayload {
  displayName?: string;
  colorHex?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface DefaultPriorityRule {
  id: string;
  condition: string;
  operator: string;
  value: string;
  priorityDefinitionId: string;
  active: boolean;
}

export interface UpsertDefaultPriorityRulePayload {
  condition: string;
  operator: string;
  value: string;
  priorityDefinitionId: string;
  active?: boolean;
}

export interface WorkshopSlaTarget {
  id: string;
  priorityDefinitionId: string;
  durationValue: number;
  durationUnit: string;
  active: boolean;
}

export interface UpdateWorkshopSlaTargetPayload {
  durationValue: number;
  durationUnit: string;
  active?: boolean;
}

export interface StageSlaTarget {
  id: string;
  stageKey: string;
  priorityDefinitionId: string;
  ownerRole: string;
  durationValue: number;
  durationUnit: string;
  active: boolean;
}

export interface UpdateStageSlaTargetPayload {
  durationValue: number;
  durationUnit: string;
  active?: boolean;
}

export interface SlaStatusRule {
  id: string;
  atRiskThresholdPct: number;
}

export interface UpdateSlaStatusRulePayload {
  atRiskThresholdPct: number;
}

export interface ServicePolicyVersion {
  id: string;
  versionLabel: string;
  effectiveFrom: string;
  isCurrent: boolean;
  createdByName: string | null;
}

function getRoleHeaders() {
  const role = useAuthStore.getState().user?.role;
  return role ? { 'x-user-role': role } : undefined;
}

export const servicePolicyService = {
  async getPriorities(): Promise<PriorityDefinition[]> {
    const response = await apiClient.get<ApiSuccessResponse<PriorityDefinition[]>>(
      '/api/v1/service-policy/priorities',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async createPriority(payload: CreatePriorityDefinitionPayload): Promise<PriorityDefinition> {
    const response = await apiClient.post<ApiSuccessResponse<PriorityDefinition>>(
      '/api/v1/service-policy/priorities',
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async updatePriority(
    id: string,
    payload: UpdatePriorityDefinitionPayload
  ): Promise<PriorityDefinition> {
    const response = await apiClient.patch<ApiSuccessResponse<PriorityDefinition>>(
      `/api/v1/service-policy/priorities/${id}`,
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getDefaultPriorityRules(): Promise<DefaultPriorityRule[]> {
    const response = await apiClient.get<ApiSuccessResponse<DefaultPriorityRule[]>>(
      '/api/v1/service-policy/default-priority-rules',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async updateDefaultPriorityRule(
    id: string,
    payload: UpsertDefaultPriorityRulePayload
  ): Promise<DefaultPriorityRule> {
    const response = await apiClient.patch<ApiSuccessResponse<DefaultPriorityRule>>(
      `/api/v1/service-policy/default-priority-rules/${id}`,
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getWorkshopSlaTargets(): Promise<WorkshopSlaTarget[]> {
    const response = await apiClient.get<ApiSuccessResponse<WorkshopSlaTarget[]>>(
      '/api/v1/service-policy/workshop-sla',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async updateWorkshopSlaTarget(
    id: string,
    payload: UpdateWorkshopSlaTargetPayload
  ): Promise<WorkshopSlaTarget> {
    const response = await apiClient.patch<ApiSuccessResponse<WorkshopSlaTarget>>(
      `/api/v1/service-policy/workshop-sla/${id}`,
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getStageSlaTargets(): Promise<StageSlaTarget[]> {
    const response = await apiClient.get<ApiSuccessResponse<StageSlaTarget[]>>(
      '/api/v1/service-policy/stage-sla',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async updateStageSlaTarget(
    id: string,
    payload: UpdateStageSlaTargetPayload
  ): Promise<StageSlaTarget> {
    const response = await apiClient.patch<ApiSuccessResponse<StageSlaTarget>>(
      `/api/v1/service-policy/stage-sla/${id}`,
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getSlaStatusRule(): Promise<SlaStatusRule> {
    const response = await apiClient.get<ApiSuccessResponse<SlaStatusRule>>(
      '/api/v1/service-policy/sla-status-rule',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async updateSlaStatusRule(payload: UpdateSlaStatusRulePayload): Promise<SlaStatusRule> {
    const response = await apiClient.patch<ApiSuccessResponse<SlaStatusRule>>(
      '/api/v1/service-policy/sla-status-rule',
      payload,
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },

  async getVersions(): Promise<ServicePolicyVersion[]> {
    const response = await apiClient.get<ApiSuccessResponse<ServicePolicyVersion[]>>(
      '/api/v1/service-policy/versions',
      { headers: getRoleHeaders() }
    );
    return unwrapApiData(response);
  },
};
