import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { json, urlencoded } from "express";
import { config } from "./config";
import { buildCorsOptions } from "./config/cors";
import healthRoutes from "./routes";
import masterRoutes from "./routes/master.routes";
import ticketRoutes from "./routes/ticket.routes";
import ticketWorkflowRoutes from "./routes/ticket-workflow.routes";
import ticketTechnicianAssignmentRoutes from "./routes/ticket-technician-assignment.routes";
import ticketDeliveryNoteRoutes from "./routes/ticket-delivery-note.routes";
import ticketCommunicationRoutes from "./routes/ticket-communication.routes";
import jobCardRoutes from "./routes/job-card.routes";
import serviceTlWorkspaceRoutes from "./routes/service-tl-workspace.routes";
import workshopWorkspaceRoutes from "./routes/workshop-workspace.routes";
import customerRoutes from "./routes/customer.routes";
import technicianRoutes from "./routes/technician.routes";
import serviceTlRoutes from "./routes/service-tl.routes";
import technicianConsoleRoutes from "./routes/technician-console.routes";
import issueSubcategoryRoutes from "./routes/issue-subcategory.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import deploymentRoutes from "./routes/deployment.routes";
import workshopRoutes from "./routes/workshop.routes";
import workshopWorkbenchRoutes from "./routes/workshop-workbench.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes from "./routes/notification.routes";
import reportRoutes from "./routes/report.routes";
import authRoutes from "./routes/auth.routes";
import syncRoutes from "./routes/sync.routes";
import setupRoutes from "./routes/setup.routes";
import operationalDataRoutes from "./routes/operational-data.routes";
import coordinatorImportRoutes from "./routes/coordinator-import.routes";
import coordinatorWorkbenchRoutes from "./routes/coordinator-workbench.routes";
import developerToolsRoutes from "./routes/developer-tools.routes";
import partsRoutes from "./routes/parts.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import vehicleModelRateRoutes from "./routes/vehicle-model-rate.routes";
import serviceLossAnalyticsRoutes from "./routes/service-loss-analytics.routes";
import opsAdminRoutes from "./routes/ops-admin.routes";
import auditLogRoutes from "./routes/audit-log.routes";
import servicePolicyRoutes from "./routes/service-policy.routes";
import ticketPriorityRoutes from "./routes/ticket-priority.routes";
import procurementRoutes from "./routes/procurement.routes";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { authRateLimiter, globalRateLimiter } from "./middleware/rate-limit.middleware";

const app = express();

// Render (like Heroku/most PaaS) terminates TLS and proxies every request through exactly one
// hop before it reaches this process. Trusting that one hop lets Express resolve req.ip and the
// X-Forwarded-For header correctly - required for express-rate-limit to key on the real client
// IP rather than Render's internal proxy IP (which would otherwise put every request in one
// shared bucket). `1` trusts exactly one hop, not an unbounded chain - safer than `true`.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(buildCorsOptions(config.cors.allowedOrigins, config.isProduction)));
app.use(json({ limit: "15mb" }));
app.use(urlencoded({ extended: true }));
app.use(morgan("combined"));

app.use("/health", healthRoutes);
app.use("/api/v1", globalRateLimiter);
app.use("/api/v1/auth", authRateLimiter, authRoutes);
app.use("/api/v1/setup", setupRoutes);
app.use("/api/v1/settings", operationalDataRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/masters", masterRoutes);
/** Mounted before every other /api/v1/tickets router: those routers gate their whole prefix with
 * a blanket ADMIN+COORDINATOR-only requireRoles(), which would otherwise shadow this router's own
 * (correctly broader) per-route role checks for Service Engineer/Technician before they're ever reached. */
app.use("/api/v1/tickets", ticketPriorityRoutes);
app.use("/api/v1/tickets", ticketTechnicianAssignmentRoutes);
app.use("/api/v1/tickets", ticketDeliveryNoteRoutes);
app.use("/api/v1/tickets", ticketCommunicationRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/tickets", ticketWorkflowRoutes);
app.use("/api/v1/job-cards", jobCardRoutes);
app.use("/api/v1/service-tl-workspace", serviceTlWorkspaceRoutes);
app.use("/api/v1/workshop-workspace", workshopWorkspaceRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/deployments", deploymentRoutes);
app.use("/api/v1/workshop", workshopRoutes);
app.use("/api/v1/workshop-dashboard", workshopWorkbenchRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/technicians", technicianRoutes);
app.use("/api/v1/service-tls", serviceTlRoutes);
app.use("/api/v1/technician", technicianConsoleRoutes);
app.use("/api/v1/issue-subcategories", issueSubcategoryRoutes);
app.use("/api/v1/import", coordinatorImportRoutes);
app.use("/api/v1/coordinator", coordinatorWorkbenchRoutes);
app.use("/api/v1/parts", partsRoutes);
app.use("/api/v1/procurement", procurementRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/vehicle-models", vehicleModelRateRoutes);
app.use("/api/v1/analytics/service-loss", serviceLossAnalyticsRoutes);
app.use("/api/v1/ops-admin", opsAdminRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/service-policy", servicePolicyRoutes);
if (["development", "test"].includes(process.env.NODE_ENV ?? "")) app.use("/api/v1/developer", developerToolsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
