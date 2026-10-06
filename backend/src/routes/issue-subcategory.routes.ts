import { Router } from "express";
import { LookupController } from "../controllers/lookup.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new LookupController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/", controller.getIssueSubcategories);

export default router;
