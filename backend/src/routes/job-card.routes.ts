import { Router } from "express";
import { TicketWorkflowController } from "../controllers/ticket-workflow.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketWorkflowController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]));

router.get("/parts-search", controller.searchParts);
router.get("/", controller.listJobCards);
router.get("/:jobCardId", controller.getJobCard);

export default router;
