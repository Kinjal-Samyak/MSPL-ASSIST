import { env } from './env';

export const apiConfig = {
  baseUrl: env.VITE_API_BASE_URL,
  timeoutMs: 30000,
  defaultHeaders: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
} as const;
