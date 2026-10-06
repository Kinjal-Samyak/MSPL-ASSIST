import request from "supertest";
import app from "../../app";
import { AuthService } from "../../services/auth.service";
import { SyncService } from "../../services/sync.service";

describe("Integration - Sync APIs", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should_require_auth_for_sync_status", async () => {
    const response = await request(app).get("/api/v1/sync/status");
    expect(response.status).toBe(401);
  });

  it("should_return_sync_status_when_authenticated", async () => {
    jest.spyOn(AuthService.prototype, "verifyAccessToken").mockReturnValue({
      userId: "user-1",
      role: "ADMIN",
      email: "admin@mspl.in",
      type: "access",
    });
    jest.spyOn(SyncService.prototype, "getStatus").mockResolvedValue({
      lastSync: null,
      nextSync: null,
      durationMs: null,
      rowsProcessed: 0,
      rowsFailed: 0,
      currentStatus: "IDLE",
    });

    const response = await request(app)
      .get("/api/v1/sync/status")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.currentStatus).toBe("IDLE");
  });
});
