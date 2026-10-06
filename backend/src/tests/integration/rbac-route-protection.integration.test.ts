import request from "supertest";
import app from "../../app";
import { AuthService } from "../../services/auth.service";
import { TechnicianConsoleService } from "../../services/technician-console.service";
import { MasterService } from "../../services/master.service";
import { LookupService } from "../../services/lookup.service";

const coordinatorOnlyDeniedEndpoints = [
  "/api/v1/admin/dashboard",
  "/api/v1/parts/catalog",
  "/api/v1/sync/status",
  "/api/v1/developer/health",
  "/api/v1/technician/dashboard",
] as const;

const technicianDeniedEndpoints = [
  "/api/v1/tickets",
  "/api/v1/customers",
  "/api/v1/vehicles",
  "/api/v1/deployments",
  "/api/v1/workshop/dashboard",
  "/api/v1/notifications/dashboard",
  "/api/v1/reports/dashboard",
  "/api/v1/masters/statuses",
  "/api/v1/issue-subcategories",
  "/api/v1/technicians",
] as const;

describe("Integration - route authorization", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function authenticateAs(role: "ADMIN" | "COORDINATOR" | "TECHNICIAN" | "SERVICE_TL"): void {
    jest.spyOn(AuthService.prototype, "verifyAccessToken").mockReturnValue({
      userId: `${role.toLowerCase()}-1`,
      role,
      email: `${role.toLowerCase()}@msplassist.test`,
      type: "access",
    });
  }

  it.each([
    "/api/v1/admin/dashboard",
    "/api/v1/tickets",
    "/api/v1/customers",
    "/api/v1/vehicles",
    "/api/v1/deployments",
    "/api/v1/workshop/dashboard",
    "/api/v1/notifications/dashboard",
    "/api/v1/reports/dashboard",
    "/api/v1/parts/catalog",
    "/api/v1/masters/statuses",
    "/api/v1/issue-subcategories",
    "/api/v1/technicians",
    "/api/v1/sync/status",
  ])("requires authentication for %s", async (endpoint) => {
    const response = await request(app).get(endpoint);

    expect(response.status).toBe(401);
  });

  it.each(coordinatorOnlyDeniedEndpoints)("denies a Coordinator from %s", async (endpoint) => {
    authenticateAs("COORDINATOR");

    const response = await request(app).get(endpoint).set("Authorization", "Bearer test-token");

    expect(response.status).toBe(403);
  });

  it.each(technicianDeniedEndpoints)("denies a Technician from %s", async (endpoint) => {
    authenticateAs("TECHNICIAN");

    const response = await request(app).get(endpoint).set("Authorization", "Bearer test-token");

    expect(response.status).toBe(403);
  });

  it("allows an Administrator through the Technician route guard", async () => {
    authenticateAs("ADMIN");
    jest.spyOn(TechnicianConsoleService.prototype, "dashboard").mockResolvedValue({
      assignedJobs: 0,
      jobsInProgress: 0,
      waitingForParts: 0,
      completedToday: 0,
      averageRepairTimeHours: 0,
      slaCompliancePercent: 100,
      overdueJobs: 0,
      jobCardStageCounts: { IN_PROGRESS: 0, WAITING_PARTS: 0, COMPLETED: 0, RFD: 0 },
    });

    const response = await request(app)
      .get("/api/v1/technician/dashboard")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
  });

  it.each(["/api/v1/masters/statuses", "/api/v1/technicians"] as const)(
    "allows a Service Engineer (SERVICE_TL) through the Job Queue filter data source %s",
    async (endpoint) => {
      authenticateAs("SERVICE_TL");
      jest.spyOn(MasterService.prototype, "getStatuses").mockResolvedValue([]);
      jest.spyOn(LookupService.prototype, "getTechnicians").mockResolvedValue([]);

      const response = await request(app).get(endpoint).set("Authorization", "Bearer test-token");

      expect(response.status).toBe(200);
    }
  );
});
