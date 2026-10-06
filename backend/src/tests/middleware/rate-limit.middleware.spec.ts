import request from "supertest";
import express from "express";
import { authRateLimiter, globalRateLimiter } from "../../middleware/rate-limit.middleware";

describe("rate limiting middleware", () => {
  it("should_be_skipped_entirely_when_NODE_ENV_is_test_so_the_test_suite_is_never_rate_limited", async () => {
    expect(process.env.NODE_ENV).toBe("test");

    const app = express();
    app.use(globalRateLimiter);
    app.use(authRateLimiter);
    app.get("/probe", (_req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 25; i += 1) {
      const response = await request(app).get("/probe");
      expect(response.status).toBe(200);
    }
  });

  it("should_expose_standard_RateLimit_headers_when_not_skipped", async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const app = express();
      app.use(globalRateLimiter);
      app.get("/probe", (_req, res) => res.status(200).json({ ok: true }));

      const response = await request(app).get("/probe");
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty("ratelimit-limit");
    } finally {
      process.env.NODE_ENV = previousEnv;
    }
  });
});
