import { Router } from "express";
import { TicketPriorityController } from "../controllers/ticket-priority.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketPriorityController();

router.use(requireAccessToken);

/** Only Coordinator and Service Engineer may ever change priority (per the frozen Service Policy spec -
 * Admin is deliberately not in this list, matching the confirmed "no Admin override" decision).
 * The service layer further restricts by lock state (before Service Engineer / Technician assignment). */
router.patch("/:ticketId/priority", requireRoles(["COORDINATOR", "SERVICE_TL"]), controller.updatePriority);
router.get("/:ticketId/priority-history", requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL", "TECHNICIAN"]), controller.listPriorityChanges);

export default router;
