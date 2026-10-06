import request from "supertest";
import app from "../../app";
import { SetupService } from "../../services/setup.service";

describe("Integration - Setup Bootstrap API", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should_create_first_admin_via_bootstrap_endpoint", async () => {
    jest.spyOn(SetupService.prototype, "bootstrap").mockResolvedValue({
      status: "SUCCESS",
      message: "System initialized successfully.",
      adminUserId: "user-1",
      initializedAt: "2026-07-13T00:00:00.000Z",
    });

    const response = await request(app).post("/api/v1/setup/bootstrap").send({
      companyName: "MSPL Assist",
      adminName: "Admin User",
      email: "admin@mspl.in",
      password: "secret123",
      confirmPassword: "secret123",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: "SUCCESS",
      adminUserId: "user-1",
    });
  });
});

