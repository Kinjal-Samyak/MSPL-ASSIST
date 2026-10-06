import { Router } from "express";
import { WorkshopWorkbenchController } from "../controllers/workshop-workbench.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new WorkshopWorkbenchController();

/**
 * Read-only Job Card oversight for the Coordinator/Admin-facing Workshop Workbench page.
 * Distinct from workshop-workspace.routes.ts (Service Engineer/Technician mutation actions) and
 * the legacy workshop.routes.ts (pre-workflow-stage ticket-status module) - this is purely
 * an additive reporting surface over the existing Ticket/JobCard tables.
 */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/summary", controller.getSummary);
router.get("/job-cards", controller.listJobCards);

export default router;
