import { Router } from "express";
import { TicketWorkflowController } from "../controllers/ticket-workflow.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketWorkflowController();

/**
 * Coordinator Workspace only. Assigning a Service Engineer is how a Coordinator kicks off
 * review; everything past this point belongs to the Workshop/Technician Workspace
 * (see workshop-workspace.routes.ts) and must not be reachable by a Coordinator.
 */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.post("/:ticketId/assign-service-tl", controller.assignServiceTl);

/**
 * Final closure decision (Close Ticket / Keep Ticket Open) is a Coordinator action:
 * ticket ownership returns to the Coordinator once the job card reaches RFD.
 */
router.post("/:ticketId/close-decision", controller.closeTicketDecision);

export default router;
