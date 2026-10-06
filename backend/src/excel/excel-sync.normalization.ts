const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_IN_MILLISECONDS = 86_400_000;

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().replace(/\s+/g, " ");
}

export function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizePhoneNumber(value: unknown): string {
  let normalized = typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("fullwide", { useGrouping: false, maximumFractionDigits: 0 })
    : normalizeText(value);
  if (/^\d+\.0+$/.test(normalized)) {
    normalized = normalized.slice(0, normalized.indexOf("."));
  }
  return normalized.replace(/\D/g, "");
}

export function normalizeIdentifier(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

export function normalizeAssetKey(value: unknown): string {
  return normalizeIdentifier(value).replace(/[^A-Z0-9]/g, "");
}

function createUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const date = new Date(EXCEL_EPOCH_UTC + value * DAY_IN_MILLISECONDS);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  if (/^\d+(?:\.0+)?$/.test(normalized)) {
    const serial = Number(normalized);
    return serial > 0 ? parseExcelDate(serial) : null;
  }

  const dayFirst = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirst) {
    return createUtcDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));
  }

  const isoDate = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDate) {
    return createUtcDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value: unknown): string {
  return parseExcelDate(value)?.toISOString() ?? normalizeText(value);
}
