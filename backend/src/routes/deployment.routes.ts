import { Router } from "express";
import { DeploymentModuleController } from "../controllers/deployment-module.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new DeploymentModuleController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/dashboard", controller.getDashboard);
router.get("/", controller.getDeployments);
router.get("/search", controller.searchDeployments);
router.get("/:deploymentId", controller.getDeploymentById);
router.get("/:deploymentId/timeline", controller.getTimeline);
router.get("/:deploymentId/payments", controller.getPayments);
router.get("/:deploymentId/history", controller.getHistory);
router.get("/:deploymentId/status", controller.getStatus);
router.patch("/:deploymentId/close", controller.closeDeployment);
router.patch("/:deploymentId/reopen", controller.reopenDeployment);

export default router;
