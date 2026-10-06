import { Router } from "express";
import { VehicleModelRateController } from "../controllers/vehicle-model-rate.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new VehicleModelRateController();

/** Rental rate configuration is financial data driving Service Loss Analytics - Admin-only. */
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]));

router.get("/", controller.list);
router.get("/:vehicleModelId/rates", controller.listRateHistory);
router.post("/:vehicleModelId/rates", controller.addRate);
router.patch("/:vehicleModelId/sla-target", controller.updateSlaTarget);

export default router;
