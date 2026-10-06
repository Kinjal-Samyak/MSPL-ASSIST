import { Router } from "express";
import { LookupController } from "../controllers/lookup.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new LookupController();

/** Document 9, Phase 9.2 fix: a Service Engineer must be able to list technicians to populate the
 * Assign/Reassign Technician picker on their own tickets - this route previously excluded
 * SERVICE_TL entirely, silently leaving that dropdown empty for every Service Engineer. */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR", "SERVICE_TL"]));

router.get("/", controller.getTechnicians);

export default router;
