import { Router } from "express";
import { TicketCommunicationController } from "../controllers/ticket-communication.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketCommunicationController();

/**
 * Mounted on the shared /api/v1/tickets prefix BEFORE ticket.routes.ts (whose blanket
 * ADMIN+COORDINATOR gate would otherwise block Service Engineer/Technician from the read-only
 * communication-center view). Send/resend stay Coordinator+Admin only, per-route.
 */
router.get(
  "/:ticketId/communication-center",
  requireAccessToken,
  requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL", "TECHNICIAN"]),
  controller.getCommunicationCenter
);
router.post("/:ticketId/communication/send", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]), controller.send);
router.post("/communication/:communicationId/resend", requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]), controller.resend);

export default router;
