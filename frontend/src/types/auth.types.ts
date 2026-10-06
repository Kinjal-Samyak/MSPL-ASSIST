import type { UserRole } from '@mspl/shared-constants';

export type { UserRole } from '@mspl/shared-constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
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
