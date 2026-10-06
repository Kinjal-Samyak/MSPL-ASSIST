import rateLimit from "express-rate-limit";
import { config } from "../config";

/** Deployment Readiness Audit, Step 4 (High): no rate limiting existed anywhere, including on
 * login. Skipped entirely under NODE_ENV=test (matches the existing developer-routes gate in
 * app.ts) so the Jest suite - which fires far more requests per minute than a real client ever
 * would - is never affected; skipped for local/manual development traffic below the configured
 * threshold is the same "reasonable limit" as production, just generous enough by default that a
 * developer clicking through the app will never hit it. */
const skipDuringTests = (): boolean => process.env.NODE_ENV === "test";

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  limit: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDuringTests,
  message: { success: false, error: { message: "Too many authentication requests. Please try again later." } },
});

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.globalWindowMs,
  limit: config.rateLimit.globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDuringTests,
  message: { success: false, error: { message: "Too many requests. Please try again later." } },
});
