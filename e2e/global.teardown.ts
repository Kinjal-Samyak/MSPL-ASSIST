import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTimings } from './utils/timings.js';

export default async function globalTeardown(): Promise<void> {
  const reportsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'reports');
  await mkdir(reportsDirectory, { recursive: true });
  const timings = await readTimings();
  let results: unknown = null;
  try { results = JSON.parse(await readFile(path.join(reportsDirectory, 'results.json'), 'utf8')); } catch { /* reporters may finalize after teardown */ }
  await writeFile(path.join(reportsDirectory, 'run-summary.json'), JSON.stringify({
    completedAt: new Date().toISOString(),
    timingSummary: timings,
    reporterResultsAvailableAtTeardown: results !== null,
    artifacts: { html: 'reports/html', json: 'reports/results.json', junit: 'reports/results.xml', failures: 'reports/test-results' },
  }, null, 2));
}
