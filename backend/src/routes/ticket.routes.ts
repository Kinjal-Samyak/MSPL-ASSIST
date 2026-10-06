import { Router } from "express";
import { TicketController } from "../controllers/ticket.controller";
import { TicketWorkflowController } from "../controllers/ticket-workflow.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketController();
const workflowController = new TicketWorkflowController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/", controller.getTickets);
router.post("/conversation", controller.createConversationTicket);
router.post("/:ticketId/comments", controller.createComment);
router.get("/:ticketId/comments", controller.getComments);
router.post("/:ticketId/attachments", controller.createAttachment);
router.get("/:ticketId/attachments", controller.getAttachments);
router.get("/:ticketId/notifications", controller.getNotifications);
router.patch("/:ticketId/status", controller.updateStatus);
router.patch("/:ticketId/eta", controller.updateEta);
router.patch("/:ticketId/charges", controller.updateCharges);
router.get("/:ticketId", controller.getTicketById);
/** Read-only Job Card view for the Tickets module's ticket workflow detail (spare parts, work performed, charges). */
router.get("/:ticketId/job-card", workflowController.getJobCardDetail);
router.post("/", controller.createTicket);

export default router;
