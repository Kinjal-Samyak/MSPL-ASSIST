import { Router } from "express";
import { TicketWorkflowController } from "../controllers/ticket-workflow.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TicketWorkflowController();

/**
 * Workshop/Technician Workspace: Service Engineer and Technician share this workspace.
 * Coordinator has no access here (workspace isolation) - mounted on its own prefix
 * so it never passes through ticket.routes.ts's Coordinator/Admin-only gate.
 */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "SERVICE_TL", "TECHNICIAN"]));

router.post("/tickets/:ticketId/transfer-service-tl", controller.transferServiceTl);
router.post("/tickets/:ticketId/resolve-consultation", controller.resolveConsultation);
router.post("/tickets/:ticketId/require-workshop", controller.requireWorkshop);
router.post("/tickets/:ticketId/job-card/waiting-for-parts", controller.waitingForParts);
router.post("/tickets/:ticketId/job-card/resume", controller.resume);
router.post("/tickets/:ticketId/job-card/start-repair", controller.startRepair);
router.post("/tickets/:ticketId/job-card/mark-completed", controller.markJobCardCompleted);
router.post("/tickets/:ticketId/job-card/ready-for-deployment", controller.readyForDeployment);
router.post("/tickets/:ticketId/job-card/return-for-rework", controller.returnForRework);
router.post("/tickets/:ticketId/job-card/close-ticket", controller.closeTicketAfterVerification);
router.get("/tickets/:ticketId/job-card", controller.getJobCardDetail);
router.patch("/tickets/:ticketId/job-card", controller.saveJobCardDetails);
router.post("/tickets/:ticketId/job-card/spare-part-requests", controller.requestSpareParts);
router.get("/tickets/:ticketId/job-card/spare-part-requests", controller.listSparePartRequests);
/** Cross-job-card rollup for Inventory's "Part Requisitions" page - Service Engineer/Admin only (unlike
 * the ticket-scoped route above, a Technician has no legitimate reason to browse every job card's
 * requests at once). */
router.get("/job-card/spare-part-requests", requireRoles(["ADMIN", "SERVICE_MANAGER", "SERVICE_TL"]), controller.listAllSparePartRequests);
router.post("/job-card/spare-part-requests/:requestId/approve", controller.approveSparePartRequest);
router.post("/job-card/spare-part-requests/:requestId/reject", controller.rejectSparePartRequest);
router.post("/job-card/spare-part-requests/:requestId/reverse", controller.reverseSparePartRequest);
router.post("/tickets/:ticketId/job-card/spare-part-requests/approve-all", controller.approveAllSparePartRequests);
router.post("/tickets/:ticketId/job-card/spare-parts/return", controller.returnSparePartsToInventory);
/** Return Control Policy (Document 8): Technician submits/views, Service Engineer/Admin decides -
 * enforced in the service layer (submitSparePartReturnRequest / decideSparePartReturnRequest),
 * same pattern as the spare-part-request approve/reject routes just above. */
router.post("/tickets/:ticketId/job-card/spare-part-return-requests", controller.submitSparePartReturnRequest);
router.get("/tickets/:ticketId/job-card/spare-part-return-requests", controller.listSparePartReturnRequests);
router.post("/job-card/spare-part-return-requests/:requestId/approve", controller.approveSparePartReturnRequest);
router.post("/job-card/spare-part-return-requests/:requestId/reject", controller.rejectSparePartReturnRequest);
/** Consumption Rules (Document 8): Technician records usage of already-issued stock - never moves
 * inventory (see recordConsumedQuantity). */
router.post("/tickets/:ticketId/job-card/spare-parts/consumption", controller.recordConsumedQuantity);
router.get("/tickets/:ticketId/job-card/pdf", controller.downloadJobCardPdf);
router.get("/tickets/:ticketId/job-card/pdf-history", controller.listJobCardPdfHistory);
router.get("/job-card/pdf-history/:pdfHistoryId", controller.downloadJobCardPdfHistoryItem);
router.post("/tickets/:ticketId/job-card/unlock", controller.unlockJobCard);

export default router;
