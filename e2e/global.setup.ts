import { chromium, request } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './utils/command.js';
import { adminCredentials, trainingDatabase, urls, validateE2EConfiguration } from './utils/config.js';
import { type SmokeCheck, writeSmokeReport } from './utils/smoke.js';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDirectory = path.join(rootDirectory, 'backend');

export default async function globalSetup(): Promise<void> {
  const checks: SmokeCheck[] = [];
  let baseUrl = '';
  let apiUrl = '';
  let databaseUrl = '';
  try {
    validateE2EConfiguration();
    ({ baseUrl, apiUrl } = urls());
    databaseUrl = trainingDatabase();
    const admin = adminCredentials();
    const resetEnvironment = {
      DATABASE_URL: databaseUrl,
      MSPL_RUNTIME_ENV: 'training',
      DEVELOPMENT_TEST_SEED: 'true',
      DEFAULT_ADMIN_PASSWORD: admin.password,
    };

    // This destructive operation is deliberately gated by both the Training URL check and E2E_RESET_TRAINING_DB.
    // Prisma's migrate reset is not usable with the current local schema engine, so recreate only the verified Training schema
    // and then replay the repository's existing migrations. No application migration is created or changed by the E2E harness.
    await run('npx', ['prisma', 'db', 'execute', '--stdin'], backendDirectory, resetEnvironment, 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    await run('npx', ['prisma', 'migrate', 'deploy'], backendDirectory, resetEnvironment);
    await run('node', ['prisma/seed.js'], backendDirectory, resetEnvironment);
    await run('node', ['prisma/seed-development.js'], backendDirectory, resetEnvironment);
    checks.push({ name: 'training-database-reset', passed: true });

    const api = await request.newContext();
    const health = await api.get(`${apiUrl}/health`);
    await api.dispose();
    if (!health.ok()) throw new Error(`Training API health check failed (${health.status()}).`);
    checks.push({ name: 'backend-reachable', passed: true });
    checks.push({ name: 'api-health', passed: true });

    if (!existsSync(chromium.executablePath())) {
      throw new Error('Playwright Chromium is not installed. Run npm run install:browsers --prefix e2e.');
    }
    if (!existsSync(path.join(rootDirectory, 'e2e/node_modules/@playwright/test'))) {
      throw new Error('Playwright dependencies are missing. Run npm install --prefix e2e before testing.');
    }
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Sign in to your account' }).waitFor();
    checks.push({ name: 'frontend-reachable', passed: true });
    checks.push({ name: 'login-page', passed: true });
    await page.getByLabel('Email address').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('status', { name: 'Training environment' }).waitFor();
    checks.push({ name: 'training-banner', passed: true });
    await browser.close();
  } catch (error) {
    checks.push({ name: checks.length === 0 ? 'backend-reachable' : 'training-banner', passed: false, detail: error instanceof Error ? error.message : String(error) });
    await writeSmokeReport(checks);
    throw error;
  }
  await writeSmokeReport(checks);

  const reportsDirectory = path.resolve(rootDirectory, 'e2e/reports');
  mkdirSync(reportsDirectory, { recursive: true });
  writeFileSync(path.join(reportsDirectory, 'run-context.json'), JSON.stringify({ startedAt: new Date().toISOString(), baseUrl, apiUrl, trainingDatabase: new URL(databaseUrl).pathname }, null, 2));
}
