import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new DashboardController();

/** Every operational role lands on the main Dashboard page, so this is intentionally broader than the Reports module's ADMIN+COORDINATOR gate. */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL", "TECHNICIAN"]));

router.get("/summary", controller.getSummary);

export default router;
