export function normalizePhoneNumber(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = normalizePhoneNumber(value);
  return digits.length >= 7 && digits.length <= 15;
}

export function formatPhoneNumber(value: string): string {
  const digits = normalizePhoneNumber(value);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

export function isValidMvTrackNumber(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{1,63}$/i.test(value.trim());
}

export function isValidRegistrationNumber(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9 -]{3,31}$/i.test(value.trim());
}

export function parseSequenceNumber(value: string, prefix: string): number | null {
  const match = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`).exec(value.trim());
  return match ? Number(match[1]) : null;
}

export const parseTicketNumber = (ticketNumber: string, prefix: string) => parseSequenceNumber(ticketNumber, prefix);
export const parseJobCardNumber = (jobCardNumber: string, prefix: string) => parseSequenceNumber(jobCardNumber, prefix);

export function formatIsoDate(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

export function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

export function toErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
