import { Router } from "express";
import { AuditLogController } from "../controllers/audit-log.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const controller = new AuditLogController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]), requirePermission("AUDIT_LOGS_READ"));

router.get("/", controller.list);

export default router;
