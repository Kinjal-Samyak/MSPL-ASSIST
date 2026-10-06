import { existsSync } from 'node:fs';
import { URL } from 'node:url';

export interface Credentials {
  email: string;
  password: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required E2E environment variable: ${name}`);
  return value;
}

function httpUrl(name: string): string {
  const value = required(name);
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }
  return value.replace(/\/$/, '');
}

function trainingDatabaseUrl(): string {
  const value = required('E2E_TRAINING_DATABASE_URL');
  const parsed = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !/training/i.test(parsed.pathname)) {
    throw new Error('E2E_TRAINING_DATABASE_URL must be a PostgreSQL database whose name identifies it as Training.');
  }
  return value;
}

export const e2eConfig = {
  baseUrl: process.env.E2E_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:5173',
  apiUrl: process.env.E2E_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000',
  runtimeEnvironment: process.env.MSPL_RUNTIME_ENV,
  resetEnabled: process.env.E2E_RESET_TRAINING_DB === 'true',
  reportsDirectory: new URL('../reports/', import.meta.url),
  browserExecutableAvailable: () => existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH ?? ''),
};

export function validateE2EConfiguration(): void {
  if (process.env.MSPL_RUNTIME_ENV !== 'training') {
    throw new Error('E2E tests are blocked unless MSPL_RUNTIME_ENV=training.');
  }
  if (process.env.E2E_RESET_TRAINING_DB !== 'true') {
    throw new Error('E2E tests are blocked unless E2E_RESET_TRAINING_DB=true.');
  }
  httpUrl('E2E_BASE_URL');
  httpUrl('E2E_API_URL');
  trainingDatabaseUrl();
  adminCredentials();
  coordinatorCredentials();
  technicianCredentials();
}

export function urls() {
  return { baseUrl: httpUrl('E2E_BASE_URL'), apiUrl: httpUrl('E2E_API_URL') };
}

export function trainingDatabase(): string {
  return trainingDatabaseUrl();
}

export function adminCredentials(): Credentials {
  return { email: required('E2E_ADMIN_EMAIL'), password: required('E2E_ADMIN_PASSWORD') };
}

export function coordinatorCredentials(): Credentials {
  return { email: required('E2E_COORDINATOR_EMAIL'), password: required('E2E_COORDINATOR_PASSWORD') };
}

export function technicianCredentials(): Credentials {
  return { email: required('E2E_TECHNICIAN_EMAIL'), password: required('E2E_TECHNICIAN_PASSWORD') };
}
