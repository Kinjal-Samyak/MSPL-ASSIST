import { Router } from "express";
import { ProcurementController } from "../controllers/procurement.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const controller = new ProcurementController();

/**
 * Inventory's Procurement domain (Suppliers -> Procurement Requests -> Purchase Orders) - owned
 * by Service Engineer/Service Manager, per the ownership-based navigation IA. Receiving stock happens
 * through Inventory Upload (parts.routes.ts), not a Goods Receipt endpoint here - Inventory
 * Upload is the sole receipt mechanism, since it already captures what a GRN would (invoice
 * number, quantities) and a Service Engineer is already trained on it. Gated by the fine-grained
 * permission catalog (requirePermission), not just the coarse role check below - a deliberate
 * improvement over Parts/JobCard's role-only gating, done right from day one for a new domain
 * (see permission-catalog.ts's "Procurement" category).
 */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"]));

router.get("/suppliers", requirePermission("PROCUREMENT_SUPPLIERS_READ"), controller.listSuppliers);
router.post("/suppliers", requirePermission("PROCUREMENT_SUPPLIERS_WRITE"), controller.createSupplier);
router.patch("/suppliers/:supplierId", requirePermission("PROCUREMENT_SUPPLIERS_WRITE"), controller.updateSupplier);

router.get("/requests", requirePermission("PROCUREMENT_REQUESTS_READ"), controller.listProcurementRequests);
router.post("/requests", requirePermission("PROCUREMENT_REQUESTS_WRITE"), controller.createProcurementRequest);
router.post("/requests/:requestId/approve", requirePermission("PROCUREMENT_REQUESTS_APPROVE"), controller.approveProcurementRequest);
router.post("/requests/:requestId/reject", requirePermission("PROCUREMENT_REQUESTS_APPROVE"), controller.rejectProcurementRequest);

router.get("/purchase-orders", requirePermission("PURCHASE_ORDERS_READ"), controller.listPurchaseOrders);
router.get("/purchase-orders/:purchaseOrderId", requirePermission("PURCHASE_ORDERS_READ"), controller.getPurchaseOrder);
router.get("/purchase-orders/:purchaseOrderId/pdf", requirePermission("PURCHASE_ORDERS_READ"), controller.downloadPurchaseOrderPdf);
router.post("/purchase-orders", requirePermission("PURCHASE_ORDERS_WRITE"), controller.createPurchaseOrder);
router.patch("/purchase-orders/:purchaseOrderId", requirePermission("PURCHASE_ORDERS_WRITE"), controller.updatePurchaseOrder);
router.post("/purchase-orders/:purchaseOrderId/issue", requirePermission("PURCHASE_ORDERS_ISSUE"), controller.issuePurchaseOrder);
router.post("/purchase-orders/:purchaseOrderId/cancel", requirePermission("PURCHASE_ORDERS_ISSUE"), controller.cancelPurchaseOrder);

export default router;
