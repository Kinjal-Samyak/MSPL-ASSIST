import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../dto/master.dto";
import type {
  ProcurementRequestDto,
  ProcurementRequestListResponseDto,
  PurchaseOrderDto,
  PurchaseOrderListResponseDto,
  SupplierDto,
  SupplierListResponseDto,
} from "../dto/procurement.dto";
import type { AdminActorContext } from "../services/admin.service";
import { ProcurementService } from "../services/procurement.service";

function toActor(req: Request): AdminActorContext {
  return {
    userId: req.authUser?.userId,
    name: req.authUser?.email,
    role: req.authUser?.role,
  };
}

export class ProcurementController {
  private readonly service: ProcurementService;

  constructor(service?: ProcurementService) {
    this.service = service ?? new ProcurementService();
  }

  // ---------- Suppliers ----------

  listSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listSuppliers(req.query);
      const response: ApiResponse<SupplierListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createSupplier(req.body, toActor(req));
      const response: ApiResponse<SupplierDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updateSupplier(req.params.supplierId, req.body, toActor(req));
      const response: ApiResponse<SupplierDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // ---------- Procurement Requests ----------

  listProcurementRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listProcurementRequests(req.query);
      const response: ApiResponse<ProcurementRequestListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createProcurementRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createProcurementRequest(req.body, toActor(req));
      const response: ApiResponse<ProcurementRequestDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  approveProcurementRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.decideProcurementRequest(req.params.requestId, "APPROVED", req.body, toActor(req));
      const response: ApiResponse<ProcurementRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  rejectProcurementRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.decideProcurementRequest(req.params.requestId, "REJECTED", req.body, toActor(req));
      const response: ApiResponse<ProcurementRequestDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  // ---------- Purchase Orders ----------

  listPurchaseOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listPurchaseOrders(req.query);
      const response: ApiResponse<PurchaseOrderListResponseDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getPurchaseOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getPurchaseOrder(req.params.purchaseOrderId);
      const response: ApiResponse<PurchaseOrderDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  createPurchaseOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createPurchaseOrder(req.body, toActor(req));
      const response: ApiResponse<PurchaseOrderDto> = { success: true, data: result };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  updatePurchaseOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.updatePurchaseOrder(req.params.purchaseOrderId, req.body, toActor(req));
      const response: ApiResponse<PurchaseOrderDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  issuePurchaseOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.issuePurchaseOrder(req.params.purchaseOrderId, toActor(req));
      const response: ApiResponse<PurchaseOrderDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  cancelPurchaseOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.cancelPurchaseOrder(req.params.purchaseOrderId, toActor(req));
      const response: ApiResponse<PurchaseOrderDto> = { success: true, data: result };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  downloadPurchaseOrderPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileName, buffer } = await this.service.renderPurchaseOrderPdf(req.params.purchaseOrderId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
