import type { Prisma } from "@prisma/client";
import { prismaClient } from "../database";

export interface RecordAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  performedById?: string | null;
  performedByName?: string | null;
  performedByRole?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogListQuery {
  page: number;
  pageSize: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AuditLogService {
  async record(input: RecordAuditLogInput): Promise<void> {
    await prismaClient.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        performedById: input.performedById ?? null,
        performedByName: input.performedByName ?? null,
        performedByRole: input.performedByRole ?? null,
        reason: input.reason ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(query: AuditLogListQuery): Promise<{
    items: Array<{
      id: string;
      entityType: string;
      entityId: string;
      action: string;
      performedById: string | null;
      performedByName: string | null;
      performedByRole: string | null;
      reason: string | null;
      metadata: unknown;
      performedAt: Date;
    }>;
    totalRecords: number;
  }> {
    const conditions: Prisma.AuditLogWhereInput[] = [];

    if (query.entityType) {
      conditions.push({ entityType: query.entityType });
    }
    if (query.entityId) {
      conditions.push({ entityId: query.entityId });
    }
    if (query.action) {
      conditions.push({ action: query.action });
    }
    if (query.search) {
      conditions.push({
        OR: [
          { performedByName: { contains: query.search, mode: "insensitive" } },
          { entityId: { contains: query.search, mode: "insensitive" } },
          { reason: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }
    if (query.dateFrom || query.dateTo) {
      conditions.push({
        performedAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      });
    }

    const where: Prisma.AuditLogWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [items, totalRecords] = await prismaClient.$transaction([
      prismaClient.auditLog.findMany({
        where,
        orderBy: { performedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prismaClient.auditLog.count({ where }),
    ]);

    return { items, totalRecords };
  }
}

export const auditLogService = new AuditLogService();
