import { Router } from "express";
import { TicketController } from "../controllers/ticket.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketController();

/**
 * Assigning a Technician is a Service Engineer (or Admin) decision, not a Coordinator one -
 * mounted as its own router on the shared /api/v1/tickets prefix, ahead of ticket.routes.ts,
 * so it can carry a narrower role gate than that router's blanket ADMIN+COORDINATOR gate.
 * The gate is scoped to this one path (not a bare router.use()) so it never intercepts
 * unrelated /api/v1/tickets requests that ticket.routes.ts still owns.
 */
router.use("/:ticketId/assign-technician", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"]));

router.patch("/:ticketId/assign-technician", controller.assignTechnician);

export default router;
