import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const timingFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../reports/timings.json');

export async function recordTiming(name: string, durationMs: number): Promise<void> {
  await mkdir(path.dirname(timingFile), { recursive: true });
  const existing = await readTimings();
  existing.push({ name, durationMs, recordedAt: new Date().toISOString() });
  await writeFile(timingFile, JSON.stringify(existing, null, 2));
}

export async function readTimings(): Promise<Array<{ name: string; durationMs: number; recordedAt: string }>> {
  try { return JSON.parse(await readFile(timingFile, 'utf8')) as Array<{ name: string; durationMs: number; recordedAt: string }>; }
  catch { return []; }
}

export async function measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try { return await operation(); }
  finally { await recordTiming(name, Math.round(performance.now() - start)); }
}
