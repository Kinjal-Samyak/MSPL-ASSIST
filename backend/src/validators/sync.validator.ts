import { ValidationError } from "../errors";
import type { SyncHistoryQueryDto } from "../dto/sync.dto";

export function validateSyncHistoryQuery(input: unknown): SyncHistoryQueryDto {
  const query = (input ?? {}) as Record<string, unknown>;
  const rawLimit = query.limit;

  if (rawLimit === undefined) {
    return { limit: 20 };
  }

  const parsed = Number(rawLimit);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new ValidationError("limit must be an integer between 1 and 200.");
  }

  return { limit: parsed };
}
