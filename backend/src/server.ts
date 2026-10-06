import app from "./app";
import { config, validateAuthStartupConfig, validateM365StartupConfig } from "./config";
import { validateRuntimeDatabaseIsolation } from "./config/runtime-environment";
import { startSyncScheduler, stopSyncScheduler } from "./excel/sync-runtime";
import { logger } from "./utils/logger";

const port = config.port;

try {
  validateRuntimeDatabaseIsolation(config.runtimeEnvironment, config.databaseUrl);
  validateAuthStartupConfig();
  logger.info({ scope: "auth-config", event: "JWT secrets loaded" });
} catch (error) {
  logger.error({
    scope: "auth-config",
    event: "Startup Configuration Failed",
    reason: error instanceof Error ? error.message : "Unknown authentication configuration error.",
  });
  process.exit(1);
}

if (process.env.NODE_ENV === "development") {
  logger.info({
    scope: "m365-config",
    event: "Startup validation skipped (development mode) - Operational Data Wizard will not function until real M365 values are set",
  });
} else {
  try {
    validateM365StartupConfig();
    logger.info({ scope: "m365-config", event: "Tenant ID loaded" });
    logger.info({ scope: "m365-config", event: "Client ID loaded" });
    logger.info({ scope: "m365-config", event: "Redirect URI loaded" });
  } catch (error) {
    logger.error({
      scope: "m365-config",
      event: "Startup Configuration Failed",
      reason: error instanceof Error ? error.message : "Unknown Microsoft 365 configuration error.",
    });
    process.exit(1);
  }
}

const server = app.listen(port, () => {
  void startSyncScheduler();
  logger.info({ scope: "startup", event: "Server listening", port, environment: config.runtimeEnvironment.name });
});

const shutdown = async (): Promise<void> => {
  await stopSyncScheduler();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
