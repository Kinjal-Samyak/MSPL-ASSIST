import type { Priority, Role } from "@prisma/client";

export type StageKey =
  | "TICKET_RESPONSE"
  | "TECHNICIAN_ASSIGNMENT"
  | "INITIAL_DIAGNOSIS"
  | "SPARE_APPROVAL"
  | "REPAIR"
  | "REDEPLOYMENT"
  | "TICKET_CLOSURE";

export type StageStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";
export type TicketSlaStatus = "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "COMPLETED_LATE";

const STAGE_LABELS: Record<StageKey, string> = {
  TICKET_RESPONSE: "Ticket Response",
  TECHNICIAN_ASSIGNMENT: "Technician Assignment",
  INITIAL_DIAGNOSIS: "Initial Diagnosis",
  SPARE_APPROVAL: "Spare Approval",
  REPAIR: "Repair",
  REDEPLOYMENT: "Redeployment",
  TICKET_CLOSURE: "Ticket Closure",
};

export interface StageTarget {
  durationValue: number;
  durationUnit: string; // MINUTES | HOURS | BUSINESS_DAYS
  ownerRole: Role;
}

export interface StageProgressItem {
  key: StageKey;
  label: string;
  ownerRole: Role;
  status: StageStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  dueBy: Date | null;
  slaStatus: TicketSlaStatus | null;
  /** true only for Spare Approval when no spare part request was ever raised - auto-completed / not applicable, not a real accountability event. */
  notApplicable?: boolean;
}

export interface WorkshopSlaResult {
  status: TicketSlaStatus;
  elapsedMs: number;
  targetMs: number;
  startedAt: Date;
  dueBy: Date;
  completedAt: Date | null;
}

/** Slice-1 approximation: 1 business day = 24 calendar hours. Slice 2 replaces this with a real,
 * holiday/working-hours-aware Business Calendar without changing this function's signature. */
export function durationToMs(value: number, unit: string): number {
  if (unit === "MINUTES") return value * 60_000;
  if (unit === "BUSINESS_DAYS") return value * 24 * 3_600_000;
  return value * 3_600_000; // HOURS (default)
}

export function computeSlaStatus(input: {
  startedAt: Date;
  completedAt: Date | null;
  targetMs: number;
  atRiskThresholdPct: number;
  now: Date;
}): { status: TicketSlaStatus; elapsedMs: number; dueBy: Date } {
  const dueBy = new Date(input.startedAt.getTime() + input.targetMs);

  if (input.completedAt) {
    const elapsedMs = input.completedAt.getTime() - input.startedAt.getTime();
    return { status: elapsedMs <= input.targetMs ? "COMPLETED" : "COMPLETED_LATE", elapsedMs, dueBy };
  }

  const elapsedMs = input.now.getTime() - input.startedAt.getTime();
  const remainingMs = input.targetMs - elapsedMs;
  const thresholdMs = input.targetMs * (input.atRiskThresholdPct / 100);

  let status: TicketSlaStatus;
  if (remainingMs < 0) status = "DELAYED";
  else if (remainingMs <= thresholdMs) status = "AT_RISK";
  else status = "ON_TRACK";

  return { status, elapsedMs, dueBy };
}

export function computeWorkshopSlaStatus(input: {
  ticketCreatedAt: Date;
  rfdAt: Date | null;
  target: { durationValue: number; durationUnit: string };
  atRiskThresholdPct: number;
  now: Date;
}): WorkshopSlaResult {
  const targetMs = durationToMs(input.target.durationValue, input.target.durationUnit);
  const { status, elapsedMs, dueBy } = computeSlaStatus({
    startedAt: input.ticketCreatedAt,
    completedAt: input.rfdAt,
    targetMs,
    atRiskThresholdPct: input.atRiskThresholdPct,
    now: input.now,
  });
  return { status, elapsedMs, targetMs, startedAt: input.ticketCreatedAt, dueBy, completedAt: input.rfdAt };
}

export interface StageProgressInput {
  priority: Priority;
  now: Date;
  atRiskThresholdPct: number;
  /** keyed by stageKey, already resolved for this ticket's priority by the caller. */
  stageTargets: Map<StageKey, StageTarget>;
  ticket: {
    createdAt: Date;
    openedAt: Date | null;
    rfdAt: Date | null;
    customerAcknowledgedAt: Date | null; // doubles as "Vehicle Assigned" per approved Slice-1 simplification
    closedAt: Date | null;
  };
  jobCard: {
    createdAt: Date;
    vehicleReceivedAt: Date | null;
    initialObservation: string | null;
    rootCause: string | null;
    updatedAt: Date;
    repairStartedAt: Date | null;
    actualCompletionAt: Date | null;
  } | null;
  sparePartRequests: Array<{ status: string; requestedAt: Date; decidedAt: Date | null }>;
}

function buildStage(
  key: StageKey,
  startedAt: Date | null,
  completedAt: Date | null,
  target: StageTarget | undefined,
  atRiskThresholdPct: number,
  now: Date,
  notApplicable = false
): StageProgressItem {
  const ownerRole = target?.ownerRole ?? ("COORDINATOR" as Role);
  if (!startedAt) {
    return { key, label: STAGE_LABELS[key], ownerRole, status: "PENDING", startedAt: null, completedAt: null, dueBy: null, slaStatus: null, notApplicable };
  }
  const targetMs = target ? durationToMs(target.durationValue, target.durationUnit) : 0;
  const { status: slaStatus, dueBy } = computeSlaStatus({ startedAt, completedAt, targetMs, atRiskThresholdPct, now });
  return {
    key,
    label: STAGE_LABELS[key],
    ownerRole,
    status: completedAt ? "COMPLETED" : "IN_PROGRESS",
    startedAt,
    completedAt,
    dueBy,
    slaStatus: notApplicable ? null : slaStatus,
    notApplicable,
  };
}

/** Ticket Response and Technician Assignment both start at ticket creation and run in parallel -
 * this is not a strict waterfall, per the frozen spec. */
export function computeStageProgress(input: StageProgressInput): StageProgressItem[] {
  const { ticket, jobCard, sparePartRequests, atRiskThresholdPct, now, stageTargets } = input;

  const ticketResponse = buildStage("TICKET_RESPONSE", ticket.createdAt, ticket.openedAt, stageTargets.get("TICKET_RESPONSE"), atRiskThresholdPct, now);

  const technicianAssignment = buildStage(
    "TECHNICIAN_ASSIGNMENT",
    ticket.createdAt,
    jobCard?.createdAt ?? null,
    stageTargets.get("TECHNICIAN_ASSIGNMENT"),
    atRiskThresholdPct,
    now
  );

  const diagnosisComplete = jobCard && jobCard.initialObservation && jobCard.rootCause ? jobCard.updatedAt : null;
  const initialDiagnosis = buildStage(
    "INITIAL_DIAGNOSIS",
    jobCard?.vehicleReceivedAt ?? null,
    diagnosisComplete,
    stageTargets.get("INITIAL_DIAGNOSIS"),
    atRiskThresholdPct,
    now
  );

  const hasSparePartRequests = sparePartRequests.length > 0;
  const earliestRequestedAt = hasSparePartRequests
    ? sparePartRequests.reduce((min, r) => (r.requestedAt < min ? r.requestedAt : min), sparePartRequests[0].requestedAt)
    : null;
  const latestDecided = hasSparePartRequests
    ? sparePartRequests.reduce((max, r) => (r.decidedAt && (!max || r.decidedAt > max) ? r.decidedAt : max), null as Date | null)
    : null;
  const anyPending = sparePartRequests.some((r) => r.status === "PENDING");
  const spareApproval = hasSparePartRequests
    ? buildStage("SPARE_APPROVAL", earliestRequestedAt, anyPending ? null : latestDecided, stageTargets.get("SPARE_APPROVAL"), atRiskThresholdPct, now)
    : buildStage("SPARE_APPROVAL", jobCard?.createdAt ?? null, jobCard?.createdAt ?? null, stageTargets.get("SPARE_APPROVAL"), atRiskThresholdPct, now, true);

  const repair = buildStage("REPAIR", jobCard?.repairStartedAt ?? null, jobCard?.actualCompletionAt ?? null, stageTargets.get("REPAIR"), atRiskThresholdPct, now);

  const redeployment = buildStage("REDEPLOYMENT", ticket.rfdAt, ticket.customerAcknowledgedAt, stageTargets.get("REDEPLOYMENT"), atRiskThresholdPct, now);

  const ticketClosure = buildStage("TICKET_CLOSURE", ticket.customerAcknowledgedAt, ticket.closedAt, stageTargets.get("TICKET_CLOSURE"), atRiskThresholdPct, now);

  return [ticketResponse, technicianAssignment, initialDiagnosis, spareApproval, repair, redeployment, ticketClosure];
}

export function computeCurrentStage(stages: StageProgressItem[], isClosed: boolean): StageProgressItem {
  if (isClosed) return stages[stages.length - 1];
  const inProgress = stages.find((s) => s.status === "IN_PROGRESS" && !s.notApplicable);
  if (inProgress) return inProgress;
  const lastActive = [...stages].reverse().find((s) => s.status !== "PENDING" && !s.notApplicable);
  return lastActive ?? stages[0];
}

export interface PolicySnapshot {
  priorityDefinitions: Array<{ id: string; legacyValue: Priority | null }>;
  workshopSlaTargets: Array<{ priorityDefinitionId: string; durationValue: number; durationUnit: string }>;
  stageSlaTargets: Array<{ stageKey: string; priorityDefinitionId: string; ownerRole: string; durationValue: number; durationUnit: string }>;
  slaStatusRule: { atRiskThresholdPct: number } | null;
}

/** Both re-keyed maps below are derived from the same small, rarely-changing snapshot (cached by
 * the service layer) - cheap to rebuild per request, no N+1 queries either way. */
export function buildStageTargetsByPriority(snapshot: PolicySnapshot): Map<Priority, Map<StageKey, StageTarget>> {
  const idToPriority = new Map(snapshot.priorityDefinitions.filter((p) => p.legacyValue).map((p) => [p.id, p.legacyValue as Priority]));
  const result = new Map<Priority, Map<StageKey, StageTarget>>();
  for (const target of snapshot.stageSlaTargets) {
    const priority = idToPriority.get(target.priorityDefinitionId);
    if (!priority) continue;
    if (!result.has(priority)) result.set(priority, new Map());
    result.get(priority)!.set(target.stageKey as StageKey, { durationValue: target.durationValue, durationUnit: target.durationUnit, ownerRole: target.ownerRole as Role });
  }
  return result;
}

export function buildWorkshopTargetsByPriority(snapshot: PolicySnapshot): Map<Priority, { durationValue: number; durationUnit: string }> {
  const idToPriority = new Map(snapshot.priorityDefinitions.filter((p) => p.legacyValue).map((p) => [p.id, p.legacyValue as Priority]));
  const result = new Map<Priority, { durationValue: number; durationUnit: string }>();
  for (const target of snapshot.workshopSlaTargets) {
    const priority = idToPriority.get(target.priorityDefinitionId);
    if (!priority) continue;
    result.set(priority, { durationValue: target.durationValue, durationUnit: target.durationUnit });
  }
  return result;
}
