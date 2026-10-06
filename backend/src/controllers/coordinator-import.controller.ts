import type { NextFunction, Request, Response } from "express";
import { CoordinatorImportService } from "../services/coordinator-import.service";

export class CoordinatorImportController {
  constructor(private readonly service = new CoordinatorImportService()) {}
  upload = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.uploadAndValidate({ ...req.body, importedById: req.authUser?.userId }); res.status(201).json({ success: true, data }); } catch (error) { next(error); } };
  validate = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.getBatch(req.params.batchId) }); } catch (error) { next(error); } };
  preview = this.validate;
  commit = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.commit(req.params.batchId) }); } catch (error) { next(error); } };
  history = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await this.service.getHistory() }); } catch (error) { next(error); } };
  details = this.validate;
  errors = async (req: Request, res: Response, next: NextFunction) => { try { const csv = await this.service.getErrorsCsv(req.params.batchId); res.type("text/csv").attachment(`import-errors-${req.params.batchId}.csv`).send(csv); } catch (error) { next(error); } };
}
