// Isolate these tests from whatever backend/.env actually exists on disk (a real local dev
// setup should have one, with real secrets) - config/index.ts calls dotenv.config() on every
// module load, which would otherwise silently refill any var this file deletes below.
jest.mock("dotenv", () => ({ config: jest.fn() }));

describe("validateAuthStartupConfig", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should_throw_when_jwt_secrets_are_missing", () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    const { validateAuthStartupConfig } = require("../../config");
    expect(() => validateAuthStartupConfig()).toThrow(
      "Authentication configuration missing required environment variables: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET."
    );
  });

  it("should_throw_when_jwt_secrets_are_left_as_the_documented_placeholder_values", () => {
    process.env.JWT_ACCESS_SECRET = "change-me-access-secret";
    process.env.JWT_REFRESH_SECRET = "change-me-refresh-secret";

    const { validateAuthStartupConfig } = require("../../config");
    expect(() => validateAuthStartupConfig()).toThrow(/placeholder values/);
  });

  it("should_not_throw_when_real_secrets_are_provided", () => {
    process.env.JWT_ACCESS_SECRET = "a-real-randomly-generated-access-secret";
    process.env.JWT_REFRESH_SECRET = "a-real-randomly-generated-refresh-secret";

    const { validateAuthStartupConfig } = require("../../config");
    expect(() => validateAuthStartupConfig()).not.toThrow();
  });

  it("should_no_longer_fall_back_to_a_hardcoded_secret", () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    const { config } = require("../../config");
    expect(config.auth.jwtAccessSecret).toBe("");
    expect(config.auth.jwtRefreshSecret).toBe("");
  });
});
