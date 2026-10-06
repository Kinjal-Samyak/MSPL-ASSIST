import { Router } from "express";
import { SyncController } from "../controllers/sync.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new SyncController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]));
router.post("/run", controller.runSync);
router.get("/status", controller.getStatus);
router.get("/history", controller.getHistory);

export default router;
