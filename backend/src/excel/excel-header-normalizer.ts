import { normalizeText } from "./excel-sync.normalization";

export type ExcelSourceProfile = "MASTER_DEPLOYMENT" | "INVENTORY_NSPL";

export type CanonicalHeader =
  | "rider"
  | "phone"
  | "hub"
  | "vehicle"
  | "mvTrackNumber"
  | "plan"
  | "status"
  | "deploymentDate"
  | "returnDate"
  | "coordinator"
  | "paidStatus"
  | "fddStatus"
  | "model"
  | "modelCode"
  | "batteryNumber"
  | "chargerNumber"
  | "iotDevice"
  | "vin"
  | "motorNumber"
  | "chassisNumber";

interface HeaderFieldPolicy {
  aliases: readonly string[];
  weight: number;
  required: boolean;
}

export interface HeaderResolution {
  source: ExcelSourceProfile;
  headerRowIndex: number;
  confidence: number;
  matchedRequiredFields: number;
}

const MASTER_HEADER_POLICY: Partial<Record<CanonicalHeader, HeaderFieldPolicy>> = {
  rider: { aliases: ["rider name", "customer name", "rider", "customer"], weight: 2, required: false },
  phone: { aliases: ["rider phone number", "rider phone", "phone number", "phone", "mobile number", "mobile"], weight: 4, required: true },
  hub: { aliases: ["hub name", "hub", "location"], weight: 1, required: false },
  vehicle: { aliases: ["motorno", "motor no", "motor number", "vehicle number", "vehicle no", "vehicle"], weight: 3, required: true },
  mvTrackNumber: { aliases: ["mv track no", "mv track number", "mvtrackno", "mvtracknumber"], weight: 4, required: true },
  plan: { aliases: ["plan", "rental plan", "plan name"], weight: 3, required: true },
  status: { aliases: ["fdd status", "rental status", "deployment status", "account status", "status"], weight: 3, required: true },
  deploymentDate: { aliases: ["start date", "deployment date", "plan start date", "date of deployment"], weight: 3, required: true },
  returnDate: { aliases: ["end date", "return date", "plan end date"], weight: 1, required: false },
  coordinator: { aliases: ["coordinator", "coordinator name", "sales collection person name", "hub incharge"], weight: 1, required: false },
  paidStatus: { aliases: ["paid status", "payment status"], weight: 1, required: false },
  fddStatus: { aliases: ["fdd status"], weight: 1, required: false },
};

const INVENTORY_HEADER_POLICY: Partial<Record<CanonicalHeader, HeaderFieldPolicy>> = {
  motorNumber: { aliases: ["motorno", "motor no", "motor number"], weight: 4, required: true },
  mvTrackNumber: { aliases: ["mv track no", "mv track number", "mvtrackno", "mvtracknumber"], weight: 4, required: true },
  model: { aliases: ["vehicle model", "model", "model name"], weight: 3, required: true },
  modelCode: { aliases: ["model code", "vehicle model code"], weight: 1, required: false },
  status: { aliases: ["inventory status", "vehicle status", "status"], weight: 3, required: true },
  hub: { aliases: ["hub name", "hub", "location"], weight: 1, required: false },
  batteryNumber: { aliases: ["battery number", "battery no", "battery"], weight: 1, required: false },
  chargerNumber: { aliases: ["charger number", "charger no", "charger"], weight: 1, required: false },
  iotDevice: { aliases: ["iot device", "iot number", "iot"], weight: 1, required: false },
  vin: { aliases: ["vin number", "vin"], weight: 1, required: false },
  chassisNumber: { aliases: ["chassis number", "chassis no", "chassis"], weight: 1, required: false },
};

export const HEADER_ALIASES: Record<CanonicalHeader, readonly string[]> = {
  rider: MASTER_HEADER_POLICY.rider?.aliases ?? [],
  phone: MASTER_HEADER_POLICY.phone?.aliases ?? [],
  hub: Array.from(new Set([...(MASTER_HEADER_POLICY.hub?.aliases ?? []), ...(INVENTORY_HEADER_POLICY.hub?.aliases ?? [])])),
  vehicle: MASTER_HEADER_POLICY.vehicle?.aliases ?? [],
  mvTrackNumber: MASTER_HEADER_POLICY.mvTrackNumber?.aliases ?? [],
  plan: MASTER_HEADER_POLICY.plan?.aliases ?? [],
  status: Array.from(new Set([...(MASTER_HEADER_POLICY.status?.aliases ?? []), ...(INVENTORY_HEADER_POLICY.status?.aliases ?? [])])),
  deploymentDate: MASTER_HEADER_POLICY.deploymentDate?.aliases ?? [],
  returnDate: MASTER_HEADER_POLICY.returnDate?.aliases ?? [],
  coordinator: MASTER_HEADER_POLICY.coordinator?.aliases ?? [],
  paidStatus: MASTER_HEADER_POLICY.paidStatus?.aliases ?? [],
  fddStatus: MASTER_HEADER_POLICY.fddStatus?.aliases ?? [],
  model: INVENTORY_HEADER_POLICY.model?.aliases ?? [],
  modelCode: INVENTORY_HEADER_POLICY.modelCode?.aliases ?? [],
  batteryNumber: INVENTORY_HEADER_POLICY.batteryNumber?.aliases ?? [],
  chargerNumber: INVENTORY_HEADER_POLICY.chargerNumber?.aliases ?? [],
  iotDevice: INVENTORY_HEADER_POLICY.iotDevice?.aliases ?? [],
  vin: INVENTORY_HEADER_POLICY.vin?.aliases ?? [],
  motorNumber: INVENTORY_HEADER_POLICY.motorNumber?.aliases ?? [],
  chassisNumber: INVENTORY_HEADER_POLICY.chassisNumber?.aliases ?? [],
};

export function normalizeHeader(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function comparableHeader(value: unknown): string {
  return normalizeHeader(value).replace(/\s+/g, "");
}

export function headerMatches(value: unknown, candidate: unknown): boolean {
  const actual = comparableHeader(value);
  const expected = comparableHeader(candidate);
  if (!actual || !expected) return false;
  return actual === expected || new RegExp(`^${expected}\\d+$`).test(actual);
}

function policyFor(source: ExcelSourceProfile): Partial<Record<CanonicalHeader, HeaderFieldPolicy>> {
  return source === "MASTER_DEPLOYMENT" ? MASTER_HEADER_POLICY : INVENTORY_HEADER_POLICY;
}

export function aliasesFor(source: ExcelSourceProfile, field: CanonicalHeader): readonly string[] {
  return policyFor(source)[field]?.aliases ?? [];
}

export function isKnownHeader(value: unknown): boolean {
  return Object.values(HEADER_ALIASES).some((aliases) => aliases.some((alias) => headerMatches(value, alias)));
}

function scoreRow(row: unknown[], source: ExcelSourceProfile): Omit<HeaderResolution, "headerRowIndex"> {
  const policy = policyFor(source);
  let confidence = 0;
  let matchedRequiredFields = 0;
  for (const fieldPolicy of Object.values(policy)) {
    const matched = row.some((cell) => fieldPolicy.aliases.some((alias) => headerMatches(cell, alias)));
    if (matched) {
      confidence += fieldPolicy.weight;
      if (fieldPolicy.required) matchedRequiredFields += 1;
    }
  }
  return { source, confidence, matchedRequiredFields };
}

export function resolveHeaderRow(rows: unknown[][], scanLimit = 30): HeaderResolution | null {
  let best: HeaderResolution | null = null;
  const sources: ExcelSourceProfile[] = ["MASTER_DEPLOYMENT", "INVENTORY_NSPL"];
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, scanLimit); rowIndex += 1) {
    for (const source of sources) {
      const scored = scoreRow(rows[rowIndex], source);
      const candidate = { ...scored, headerRowIndex: rowIndex };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }
  }
  return best && best.matchedRequiredFields >= 3 && best.confidence >= 10 ? best : null;
}

export function readCanonicalValue(
  values: Record<string, unknown>,
  canonical: CanonicalHeader,
  configuredHeader?: string,
  source?: ExcelSourceProfile
): unknown {
  const aliases = source ? aliasesFor(source, canonical) : HEADER_ALIASES[canonical];
  const candidates = [...aliases, configuredHeader].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    const key = Object.keys(values).find((header) => headerMatches(header, candidate));
    if (key && normalizeText(values[key]).length > 0) return values[key];
  }
  return null;
}
