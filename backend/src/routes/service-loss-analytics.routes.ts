import { Router } from "express";
import { ServiceLossAnalyticsController } from "../controllers/service-loss-analytics.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new ServiceLossAnalyticsController();

/** Management reporting/BI - same audience as the existing Reports module. */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/summary", controller.getSummary);
router.get("/drilldown", controller.getDrilldown);
router.get("/export", controller.export);

export default router;
