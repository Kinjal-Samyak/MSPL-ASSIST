import {
  resolveRuntimeEnvironment,
  validateRuntimeDatabaseIsolation,
} from "../../config/runtime-environment";

describe("runtime environment policy", () => {
  it("defaults to production", () => {
    expect(resolveRuntimeEnvironment()).toEqual({
      name: "production",
      isTraining: false,
      trainingTestRecipients: [],
    });
  });

  it("recognizes the explicit training environment", () => {
    expect(resolveRuntimeEnvironment("training")).toEqual({
      name: "training",
      isTraining: true,
      trainingTestRecipients: [],
    });
  });

  it("parses a comma-separated Training test recipient allowlist, normalized to lowercase", () => {
    const previous = process.env.TRAINING_TEST_RECIPIENTS;
    process.env.TRAINING_TEST_RECIPIENTS = " Admin@Msplassist.local , tester@msplassist.local,";
    try {
      expect(resolveRuntimeEnvironment("training").trainingTestRecipients).toEqual([
        "admin@msplassist.local",
        "tester@msplassist.local",
      ]);
    } finally {
      process.env.TRAINING_TEST_RECIPIENTS = previous;
    }
  });

  it("never applies a Training test recipient allowlist in production", () => {
    const previous = process.env.TRAINING_TEST_RECIPIENTS;
    process.env.TRAINING_TEST_RECIPIENTS = "admin@msplassist.local";
    try {
      expect(resolveRuntimeEnvironment("production").trainingTestRecipients).toEqual([]);
    } finally {
      process.env.TRAINING_TEST_RECIPIENTS = previous;
    }
  });

  it("rejects unsupported environment names", () => {
    expect(() => resolveRuntimeEnvironment("staging")).toThrow("MSPL_RUNTIME_ENV must be either production or training.");
  });

  it("requires Training to use a dedicated Training database", () => {
    expect(() =>
      validateRuntimeDatabaseIsolation(
        { name: "training", isTraining: true, trainingTestRecipients: [] },
        "postgresql://user:password@localhost:5432/mspl_assist"
      )
    ).toThrow("Training deployment blocked");

    expect(() =>
      validateRuntimeDatabaseIsolation(
        { name: "training", isTraining: true, trainingTestRecipients: [] },
        "postgresql://user:password@localhost:5432/mspl_assist_training"
      )
    ).not.toThrow();
  });

  it("prevents Production from using a Training database", () => {
    expect(() =>
      validateRuntimeDatabaseIsolation(
        { name: "production", isTraining: false, trainingTestRecipients: [] },
        "postgresql://user:password@localhost:5432/mspl_assist_training"
      )
    ).toThrow("Production deployment blocked");
  });
});
