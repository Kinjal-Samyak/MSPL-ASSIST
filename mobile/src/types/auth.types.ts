/**
 * Mirrors the role vocabulary in `packages/shared-constants` (the web app's source of truth).
 * Kept as a local copy rather than a cross-package import: `mobile` is an Expo/Metro project
 * outside the npm workspace root, and wiring it into the monorepo's workspace graph is an infra
 * change beyond this architecture layer - revisit if/when that convergence is worth the risk.
 */
export const USER_ROLES = ['ADMIN', 'COORDINATOR', 'TECHNICIAN', 'SERVICE_TL'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}
