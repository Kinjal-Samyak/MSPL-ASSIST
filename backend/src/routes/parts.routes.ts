import { Router } from "express";
import { PartsController } from "../controllers/parts.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new PartsController();
/**
 * Base gate covers both roles since Inventory Upload (the sole receipt mechanism - see
 * PurchaseOrder/PartsInventoryUpload) is a core Service Engineer responsibility, not an Admin-only
 * action. Bulk catalog structure changes (master import, category/subcategory/part creation,
 * category reassignment, manual stock adjustment) stay Admin-only via a per-route override below -
 * those are catalog-structure edits, not the received-stock workflow Service Engineer owns.
 */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"]));
router.get("/import/templates", controller.getTemplates);
router.post("/import/catalog/preview", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.previewCatalogImport);
router.post("/import/catalog/confirm", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.confirmCatalogImport);
router.post("/import/inventory/preview", controller.previewInventoryImport);
router.post("/import/inventory/confirm", controller.confirmInventoryImport);
router.get("/import/inventory/history", controller.listUploadHistory);
router.get("/import/inventory/history/:id/download", controller.downloadUpload);
router.get("/categories", controller.listCategories);
router.post("/categories", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.createCategory);
router.post("/subcategories", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.createSubcategory);
router.get("/catalog", controller.listParts);
router.post("/catalog", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.createPart);
router.put("/catalog/:id/category", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.updatePartCategory);
router.post("/catalog/:id/adjustments", requireRoles(["ADMIN", "SERVICE_MANAGER"]), controller.createAdjustment);
router.get("/inventory/transactions", controller.listTransactions);
router.get("/inventory/consumption-summary", controller.getConsumptionSummary);
export default router;
