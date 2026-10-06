import dotenv from "dotenv";

dotenv.config();

export type RuntimeEnvironmentName = "production" | "training";

export interface RuntimeEnvironment {
  name: RuntimeEnvironmentName;
  isTraining: boolean;
  /** Training-only allowlist: recipients that MAY receive real external notifications for UAT verification. Always empty in production. */
  trainingTestRecipients: string[];
}

function parseTrainingTestRecipients(isTraining: boolean, value = process.env.TRAINING_TEST_RECIPIENTS): string[] {
  if (!isTraining || !value) {
    return [];
  }

  return value
    .split(",")
    .map((recipient) => recipient.trim().toLowerCase())
    .filter((recipient) => recipient.length > 0);
}

/**
 * Separates business-environment policy from NODE_ENV, which remains a
 * framework/runtime setting. Training must use a dedicated database.
 */
export function resolveRuntimeEnvironment(value = process.env.MSPL_RUNTIME_ENV): RuntimeEnvironment {
  const normalized = (value ?? "production").trim().toLowerCase();

  if (normalized === "" || normalized === "production") {
    return { name: "production", isTraining: false, trainingTestRecipients: [] };
  }

  if (normalized === "training") {
    return { name: "training", isTraining: true, trainingTestRecipients: parseTrainingTestRecipients(true) };
  }

  throw new Error("MSPL_RUNTIME_ENV must be either production or training.");
}

export const runtimeEnvironment = resolveRuntimeEnvironment();

/**
 * Prevents a Training deployment from starting against an operational database,
 * and prevents a Production deployment from starting against the Training database.
 * Both deployments run the same application code and Prisma schema.
 */
export function validateRuntimeDatabaseIsolation(
  environment: RuntimeEnvironment = runtimeEnvironment,
  databaseUrl = process.env.DATABASE_URL
): void {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(databaseUrl).pathname).replace(/^\/+|\/+$/g, "");
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection string.");
  }

  const usesTrainingDatabase = /(^|[_-])training([_-]|$)/i.test(databaseName);
  if (environment.isTraining && !usesTrainingDatabase) {
    throw new Error(
      "Training deployment blocked: DATABASE_URL must point to a dedicated database whose name identifies it as training."
    );
  }

  if (!environment.isTraining && usesTrainingDatabase) {
    throw new Error(
      "Production deployment blocked: DATABASE_URL must not point to a Training database."
    );
  }
}
