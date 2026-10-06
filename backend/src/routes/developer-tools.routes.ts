import { Router } from "express";
import { DeveloperToolsService } from "../services/developer-tools.service";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const service = new DeveloperToolsService();
const respond = (operation: () => Promise<unknown>) => async (_req: unknown, res: any, next: any) => {
  try {
    res.json({ success: true, data: await operation() });
  } catch (error) {
    next(error);
  }
};

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER"]));
router.get("/health", respond(() => service.health()));
router.get("/data", respond(() => service.data()));
router.post("/validate", respond(() => service.validate()));

export default router;
