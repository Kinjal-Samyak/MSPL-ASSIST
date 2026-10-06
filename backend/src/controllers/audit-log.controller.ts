import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import { ValidationError } from "../errors";
import { auditLogService } from "../services/audit-log.service";

function toQuery(req: Request) {
  const query = req.query as Record<string, unknown>;
  const page = Number(query.page) || 1;
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
  return {
    page: page > 0 ? page : 1,
    pageSize,
    entityType: typeof query.entityType === "string" ? query.entityType : undefined,
    entityId: typeof query.entityId === "string" ? query.entityId : undefined,
    action: typeof query.action === "string" ? query.action : undefined,
    search: typeof query.search === "string" ? query.search : undefined,
    dateFrom: typeof query.dateFrom === "string" ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === "string" ? query.dateTo : undefined,
  };
}

export class AuditLogController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = toQuery(req);
      if (query.dateFrom && Number.isNaN(new Date(query.dateFrom).getTime())) {
        throw new ValidationError("dateFrom must be a valid date.");
      }
      if (query.dateTo && Number.isNaN(new Date(query.dateTo).getTime())) {
        throw new ValidationError("dateTo must be a valid date.");
      }
      const { items, totalRecords } = await auditLogService.list(query);
      const response: ApiResponse<{
        items: typeof items;
        totalRecords: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }> = {
        success: true,
        data: {
          items,
          totalRecords,
          page: query.page,
          pageSize: query.pageSize,
          totalPages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.pageSize),
        },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
