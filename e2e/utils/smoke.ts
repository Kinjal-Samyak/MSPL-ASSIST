import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SmokeCheck {
  name: 'backend-reachable' | 'frontend-reachable' | 'api-health' | 'training-database-reset' | 'login-page' | 'training-banner';
  passed: boolean;
  detail?: string;
}

const reportsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../reports');

export async function writeSmokeReport(checks: SmokeCheck[]): Promise<void> {
  await mkdir(reportsDirectory, { recursive: true });
  await writeFile(path.join(reportsDirectory, 'smoke.json'), JSON.stringify({
    completedAt: new Date().toISOString(),
    passed: checks.every((check) => check.passed),
    checks,
  }, null, 2));
}
