import { Router } from "express";
import { WorkshopController } from "../controllers/workshop.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";

const router = Router();
const controller = new WorkshopController();

router.use(requireAccessToken, requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]));

router.get("/dashboard", controller.getDashboard);
router.get("/jobs", controller.getJobs);
router.get("/jobs/search", controller.searchJobs);
router.get("/jobs/:jobId", controller.getJobById);
router.post("/jobs", controller.createJob);
router.patch("/jobs/:jobId", controller.updateJob);
router.patch("/jobs/:jobId/assign", controller.assignJob);
router.patch("/jobs/:jobId/start", controller.startJob);
router.patch("/jobs/:jobId/complete", controller.completeJob);
router.patch("/jobs/:jobId/cancel", controller.cancelJob);
router.get("/jobs/:jobId/timeline", controller.getTimeline);
router.get("/jobs/:jobId/parts", controller.getParts);
router.get("/jobs/:jobId/attachments", controller.getAttachments);

export default router;
