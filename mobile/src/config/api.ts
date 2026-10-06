import { env } from './env';

export const apiConfig = {
  baseUrl: env.apiBaseUrl,
  timeoutMs: 30000,
  apiVersionPrefix: '/api/v1',
  defaultHeaders: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
} as const;
