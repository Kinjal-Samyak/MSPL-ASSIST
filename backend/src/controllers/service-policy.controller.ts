import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import { ServicePolicyService, type ServicePolicyActor } from "../services/service-policy.service";
import { UnauthorizedError } from "../errors";
import {
  validateCreatePriorityDefinition,
  validateUpdatePriorityDefinition,
  validateUpdateSlaStatusRule,
  validateUpdateStageSlaTarget,
  validateUpdateWorkshopSlaTarget,
  validateUpsertDefaultPriorityRule,
} from "../validators/service-policy.validator";

export class ServicePolicyController {
  constructor(private readonly service = new ServicePolicyService()) {}

  private actor(req: Request): ServicePolicyActor {
    if (!req.authUser) throw new UnauthorizedError("Authentication is required.");
    return { userId: req.authUser.userId, role: req.authUser.role };
  }

  listPriorities = async (_req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.listPriorityDefinitions(); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };
  createPriority = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.createPriorityDefinition(this.actor(req), validateCreatePriorityDefinition(req.body)); const response: ApiResponse<typeof data> = { success: true, data }; res.status(201).json(response); } catch (error) { next(error); } };
  updatePriority = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.updatePriorityDefinition(this.actor(req), req.params.id, validateUpdatePriorityDefinition(req.body)); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };

  listDefaultPriorityRules = async (_req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.listDefaultPriorityRules(); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };
  updateDefaultPriorityRule = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.updateDefaultPriorityRule(this.actor(req), req.params.id, validateUpsertDefaultPriorityRule(req.body)); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };

  listWorkshopSlaTargets = async (_req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.listWorkshopSlaTargets(); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };
  updateWorkshopSlaTarget = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.updateWorkshopSlaTarget(this.actor(req), req.params.id, validateUpdateWorkshopSlaTarget(req.body)); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };

  listStageSlaTargets = async (_req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.listStageSlaTargets(); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };
  updateStageSlaTarget = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.updateStageSlaTarget(this.actor(req), req.params.id, validateUpdateStageSlaTarget(req.body)); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };

  getSlaStatusRule = async (_req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.getSlaStatusRule(); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };
  updateSlaStatusRule = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.updateSlaStatusRule(this.actor(req), validateUpdateSlaStatusRule(req.body)); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };

  listVersions = async (_req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.listServicePolicyVersions(); const response: ApiResponse<typeof data> = { success: true, data }; res.status(200).json(response); } catch (error) { next(error); } };
}
