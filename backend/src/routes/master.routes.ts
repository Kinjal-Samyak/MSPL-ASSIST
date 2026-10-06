import { Router } from "express";
import { MasterController } from "../controllers/master.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new MasterController();

/** Document 9, Phase 9.2 fix: read-only reference data (statuses/issue categories/hubs/vehicle
 * models) that the Service Engineer's Job Queue filters need (Hub, Vehicle Model) - this router
 * previously excluded SERVICE_TL, even though every route on it is a plain GET. */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL"]));

router.get("/statuses", controller.getStatuses);
router.get("/issue-categories", controller.getIssueCategories);
router.get("/hubs", controller.getHubs);
router.get("/vehicle-models", controller.getVehicleModels);

export default router;
