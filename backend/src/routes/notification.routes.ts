import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new NotificationController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/dashboard", controller.getDashboard);
router.get("/", controller.getNotifications);
router.get("/templates", controller.getTemplates);
router.post("/templates", controller.createTemplate);
router.patch("/templates/:templateId", controller.updateTemplate);
router.get("/settings", controller.getSettings);
router.patch("/settings", controller.updateSettings);
router.get("/:notificationId", controller.getNotificationById);
router.post("/send", controller.sendNotification);
router.patch("/:notificationId/read", controller.markRead);
router.patch("/:notificationId/archive", controller.archive);

export default router;
