import { Router } from "express";
import { TicketWorkflowController } from "../controllers/ticket-workflow.controller";
import { TicketClosureRequestController } from "../controllers/ticket-closure-request.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketWorkflowController();
const closureController = new TicketClosureRequestController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"]));

router.get("/dashboard", controller.serviceEngineerDashboard);
router.get("/tickets", controller.listMyTickets);
router.get("/tickets/:ticketId", controller.getMyTicket);

/** Cancellation / early-closure requests raised by a Coordinator, awaiting this Service Engineer's approval. */
router.get("/closure-requests", closureController.listPending);
router.post("/closure-requests/:requestId/approve", closureController.approve);
router.post("/closure-requests/:requestId/reject", closureController.reject);

export default router;
