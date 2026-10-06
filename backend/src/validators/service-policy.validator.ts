import { ValidationError } from "../errors";
import type {
  CreatePriorityDefinitionDto,
  UpdatePriorityDefinitionDto,
  UpdateSlaStatusRuleDto,
  UpdateStageSlaTargetDto,
  UpdateWorkshopSlaTargetDto,
  UpsertDefaultPriorityRuleDto,
} from "../dto/service-policy.dto";

const DURATION_UNITS = ["MINUTES", "HOURS", "BUSINESS_DAYS"];

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${field} is required.`);
  return value.trim();
};
const optionalString = (value: unknown, field: string): string | undefined => {
  if (value == null || value === "") return undefined;
  return requiredString(value, field);
};
const requiredPositiveInteger = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new ValidationError(`${field} must be a positive integer.`);
  return parsed;
};
const optionalBoolean = (value: unknown, field: string): boolean | undefined => {
  if (value == null) return undefined;
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be a boolean.`);
  return value;
};

export function validateCreatePriorityDefinition(input: unknown): CreatePriorityDefinitionDto {
  if (!input || typeof input !== "object") throw new ValidationError("Priority payload must be an object.");
  const body = input as Record<string, unknown>;
  return {
    code: requiredString(body.code, "code").toUpperCase(),
    displayName: requiredString(body.displayName, "displayName"),
    colorHex: requiredString(body.colorHex, "colorHex"),
    description: optionalString(body.description, "description"),
    sortOrder: requiredPositiveInteger(body.sortOrder, "sortOrder"),
  };
}

export function validateUpdatePriorityDefinition(input: unknown): UpdatePriorityDefinitionDto {
  if (!input || typeof input !== "object") throw new ValidationError("Priority update payload must be an object.");
  const body = input as Record<string, unknown>;
  return {
    displayName: optionalString(body.displayName, "displayName"),
    colorHex: optionalString(body.colorHex, "colorHex"),
    description: optionalString(body.description, "description"),
    sortOrder: body.sortOrder == null ? undefined : requiredPositiveInteger(body.sortOrder, "sortOrder"),
    active: optionalBoolean(body.active, "active"),
  };
}

export function validateUpsertDefaultPriorityRule(input: unknown): UpsertDefaultPriorityRuleDto {
  if (!input || typeof input !== "object") throw new ValidationError("Default priority rule payload must be an object.");
  const body = input as Record<string, unknown>;
  return {
    condition: requiredString(body.condition, "condition"),
    operator: requiredString(body.operator, "operator"),
    value: requiredString(body.value, "value"),
    priorityDefinitionId: requiredString(body.priorityDefinitionId, "priorityDefinitionId"),
    active: optionalBoolean(body.active, "active"),
  };
}

function validateDurationUnit(value: unknown): string {
  const unit = requiredString(value, "durationUnit").toUpperCase();
  if (!DURATION_UNITS.includes(unit)) throw new ValidationError(`durationUnit must be one of ${DURATION_UNITS.join(", ")}.`);
  return unit;
}

export function validateUpdateWorkshopSlaTarget(input: unknown): UpdateWorkshopSlaTargetDto {
  if (!input || typeof input !== "object") throw new ValidationError("Workshop SLA target payload must be an object.");
  const body = input as Record<string, unknown>;
  return {
    durationValue: requiredPositiveInteger(body.durationValue, "durationValue"),
    durationUnit: validateDurationUnit(body.durationUnit),
    active: optionalBoolean(body.active, "active"),
  };
}

export function validateUpdateStageSlaTarget(input: unknown): UpdateStageSlaTargetDto {
  if (!input || typeof input !== "object") throw new ValidationError("Stage SLA target payload must be an object.");
  const body = input as Record<string, unknown>;
  return {
    durationValue: requiredPositiveInteger(body.durationValue, "durationValue"),
    durationUnit: validateDurationUnit(body.durationUnit),
    active: optionalBoolean(body.active, "active"),
  };
}

export function validateUpdateSlaStatusRule(input: unknown): UpdateSlaStatusRuleDto {
  if (!input || typeof input !== "object") throw new ValidationError("SLA status rule payload must be an object.");
  const body = input as Record<string, unknown>;
  const atRiskThresholdPct = Number(body.atRiskThresholdPct);
  if (!Number.isInteger(atRiskThresholdPct) || atRiskThresholdPct <= 0 || atRiskThresholdPct >= 100) {
    throw new ValidationError("atRiskThresholdPct must be an integer between 1 and 99.");
  }
  return { atRiskThresholdPct };
}
