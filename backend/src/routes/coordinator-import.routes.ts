import { Router } from "express";
import { CoordinatorImportController } from "../controllers/coordinator-import.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new CoordinatorImportController();
router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));
router.post("/upload", controller.upload);
router.post("/validate/:batchId", controller.validate);
router.get("/validate/:batchId", controller.validate);
router.post("/preview/:batchId", controller.preview);
router.get("/preview/:batchId", controller.preview);
router.post("/commit/:batchId", controller.commit);
router.get("/history", controller.history);
router.get("/history/:batchId", controller.details);
router.get("/errors/:batchId", controller.errors);
export default router;
