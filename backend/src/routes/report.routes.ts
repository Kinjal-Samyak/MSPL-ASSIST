import { Router, type NextFunction, type Request, type Response } from "express";
import { ReportController } from "../controllers/report.controller";
import { requireAccessToken, requireRoles } from "../middleware/auth.middleware";
import { REPORT_ACCESS } from "../constants/report-access";
import { NotFoundError } from "../errors";

const router = Router();
const controller = new ReportController();

router.use(requireAccessToken);

/** The export endpoint's accessible report varies per request (?report=<key>), so its role
 * gate is resolved dynamically against the same REPORT_ACCESS map used by the list routes,
 * rather than a single static requireRoles([...]) applied to every export regardless of key. */
function requireReportAccess(req: Request, res: Response, next: NextFunction) {
  const key = String(req.query.report ?? "").toLowerCase();
  const roles = REPORT_ACCESS[key];
  if (!roles) {
    next(new NotFoundError(`Unknown report key: ${key}`));
    return;
  }
  requireRoles(roles)(req, res, next);
}

router.get("/executive-dashboard", requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]), controller.getExecutiveDashboard);
router.get("/dashboard", requireRoles(["ADMIN", "SERVICE_MANAGER", "COORDINATOR"]), controller.getDashboard);
router.get("/tickets", requireRoles(REPORT_ACCESS.tickets), controller.getTicketReports);
router.get("/customers", requireRoles(REPORT_ACCESS.customers), controller.getCustomerReports);
router.get("/vehicles", requireRoles(REPORT_ACCESS.vehicles), controller.getVehicleReports);
router.get("/deployments", requireRoles(REPORT_ACCESS.deployments), controller.getDeploymentReports);
router.get("/workshop", requireRoles(REPORT_ACCESS.workshop), controller.getWorkshopReports);
router.get("/notifications", requireRoles(REPORT_ACCESS.notifications), controller.getNotificationReports);
router.get("/admin", requireRoles(REPORT_ACCESS.admin), controller.getAdminReports);
router.get("/export", requireReportAccess, controller.exportReport);

export default router;
