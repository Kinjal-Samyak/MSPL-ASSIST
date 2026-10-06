import { Router } from "express";
import { ServicePolicyController } from "../controllers/service-policy.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new ServicePolicyController();

const READ_ROLES = ["ADMIN", "COORDINATOR", "SERVICE_TL", "TECHNICIAN"] as const;
const WRITE_ROLES = ["ADMIN"] as const;

router.use(requireAccessToken, requireRoles([...READ_ROLES]));

router.get("/priorities", controller.listPriorities);
router.post("/priorities", requireRoles([...WRITE_ROLES]), controller.createPriority);
router.patch("/priorities/:id", requireRoles([...WRITE_ROLES]), controller.updatePriority);

router.get("/default-priority-rules", controller.listDefaultPriorityRules);
router.patch("/default-priority-rules/:id", requireRoles([...WRITE_ROLES]), controller.updateDefaultPriorityRule);

router.get("/workshop-sla", controller.listWorkshopSlaTargets);
router.patch("/workshop-sla/:id", requireRoles([...WRITE_ROLES]), controller.updateWorkshopSlaTarget);

router.get("/stage-sla", controller.listStageSlaTargets);
router.patch("/stage-sla/:id", requireRoles([...WRITE_ROLES]), controller.updateStageSlaTarget);

router.get("/sla-status-rule", controller.getSlaStatusRule);
router.patch("/sla-status-rule", requireRoles([...WRITE_ROLES]), controller.updateSlaStatusRule);

router.get("/versions", controller.listVersions);

export default router;
