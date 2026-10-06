import { Router } from "express";
import { VehicleController } from "../controllers/vehicle.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new VehicleController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/dashboard", controller.getDashboard);
router.get("/", controller.getVehicles);
router.get("/search", controller.searchVehicles);
router.get("/:vehicleId", controller.getVehicleById);
router.get("/:vehicleId/timeline", controller.getTimeline);
router.get("/:vehicleId/current-deployment", controller.getCurrentDeployment);
router.get("/:vehicleId/deployment-history", controller.getDeploymentHistory);
router.get("/:vehicleId/service-history", controller.getServiceHistory);
router.get("/:vehicleId/status-summary", controller.getStatusSummary);
router.get("/:vehicleId/health-summary", controller.getHealthSummary);
router.get("/:vehicleId/documents", controller.getDocuments);
router.patch("/:vehicleId/activate", controller.activateVehicle);
router.patch("/:vehicleId/deactivate", controller.deactivateVehicle);

export default router;

