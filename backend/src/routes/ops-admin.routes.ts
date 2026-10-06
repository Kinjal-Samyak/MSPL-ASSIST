import { Router } from "express";
import { OpsAdminController } from "../controllers/ops-admin.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const controller = new OpsAdminController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]));

router.get("/tickets", requirePermission("OPS_TICKETS_SEARCH"), controller.searchTickets);
router.post("/tickets/:ticketId/delete", requirePermission("OPS_TICKETS_DELETE"), controller.deleteTicket);
router.post("/tickets/:ticketId/restore", requirePermission("OPS_TICKETS_RESTORE"), controller.restoreTicket);
router.post("/tickets/:ticketId/force-close", requirePermission("OPS_TICKETS_FORCE_CLOSE"), controller.forceCloseTicket);
router.post("/tickets/:ticketId/reassign", requirePermission("OPS_TICKETS_REASSIGN"), controller.reassignTicket);
router.get("/activity-timeline", requirePermission("AUDIT_LOGS_READ"), controller.searchActivityTimeline);

export default router;
