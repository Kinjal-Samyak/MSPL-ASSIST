import { Router } from "express";
import { TicketWorkflowController } from "../controllers/ticket-workflow.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketWorkflowController();

/**
 * Printing the delivery note is a Coordinator/Service Engineer/Admin action at closing time - mounted as its
 * own router on the shared /api/v1/tickets prefix, ahead of ticket.routes.ts, so Coordinator can reach it
 * despite that router's blanket ADMIN+COORDINATOR gate not covering job-card reads. Path-scoped so it
 * never intercepts unrelated /api/v1/tickets requests.
 */
router.use("/:ticketId/delivery-note", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL"]));

router.get("/:ticketId/delivery-note", controller.downloadDeliveryNote);

export default router;
