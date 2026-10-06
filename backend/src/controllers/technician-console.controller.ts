import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../errors";
import { TechnicianConsoleService } from "../services/technician-console.service";

export class TechnicianConsoleController {
  constructor(private readonly service = new TechnicianConsoleService()) {}

  dashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.dashboard(this.userId(req)) }); } catch (error) { next(error); }
  };

  jobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.listJobs(this.userId(req), this.query(req)) }); } catch (error) { next(error); }
  };

  detail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.getJob(this.userId(req), req.params.ticketId) }); } catch (error) { next(error); }
  };

  milestone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.advanceMilestone(this.userId(req), req.params.ticketId, req.body?.action, req.body?.remarks) }); } catch (error) { next(error); }
  };

  inspection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.recordInspection(this.userId(req), req.params.ticketId, req.body) }); } catch (error) { next(error); }
  };

  notes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.addRepairNote(this.userId(req), req.params.ticketId, req.body) }); } catch (error) { next(error); }
  };

  photo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.addPhoto(this.userId(req), req.params.ticketId, req.body) }); } catch (error) { next(error); }
  };

  timeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.timeline(this.userId(req), req.params.ticketId) }); } catch (error) { next(error); }
  };

  history = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.repairHistory(this.userId(req), req.params.ticketId) }); } catch (error) { next(error); }
  };

  private userId(req: Request): string {
    if (!req.authUser?.userId) throw new ValidationError("Authenticated technician identity is required.");
    return req.authUser.userId;
  }

  private query(req: Request) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;
    return { page, pageSize, search };
  }
}
