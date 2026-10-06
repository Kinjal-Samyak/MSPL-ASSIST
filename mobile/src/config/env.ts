/**
 * Environment access. Expo inlines any `EXPO_PUBLIC_*` variable from `.env` (or the shell) into
 * `process.env` at build time - no extra config needed. This is the only file allowed to read
 * `process.env` directly; everything else imports from here or from `./api`.
 */
export type AppEnvironment = 'development' | 'training' | 'production';

function resolveEnvironment(): AppEnvironment {
  const raw = process.env.EXPO_PUBLIC_APP_ENV;
  if (raw === 'production' || raw === 'training' || raw === 'development') {
    return raw;
  }
  return __DEV__ ? 'development' : 'production';
}

export const env = {
  appEnv: resolveEnvironment(),
  /**
   * Backend default port is 4000 (see backend/src/config/index.ts). This localhost fallback only
   * works for the iOS Simulator / Expo web; a physical device or Android emulator needs the host
   * machine's LAN IP, set via EXPO_PUBLIC_API_BASE_URL in `.env`.
   */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
} as const;
