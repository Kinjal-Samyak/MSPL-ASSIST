import { Router } from "express";
import { TechnicianConsoleController } from "../controllers/technician-console.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new TechnicianConsoleController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "TECHNICIAN"]));
router.get("/dashboard", controller.dashboard);
router.get("/jobs/search", controller.jobs);
router.get("/jobs", controller.jobs);
router.patch("/jobs/:ticketId/milestone", controller.milestone);
router.post("/jobs/:ticketId/inspection", controller.inspection);
router.post("/jobs/:ticketId/notes", controller.notes);
router.post("/jobs/:ticketId/photos", controller.photo);
router.get("/jobs/:ticketId/timeline", controller.timeline);
router.get("/jobs/:ticketId/history", controller.history);
router.get("/jobs/:ticketId", controller.detail);

export default router;
