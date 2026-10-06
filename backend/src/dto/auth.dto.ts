import type { Role } from "@prisma/client";

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
}

export interface AuthResponseDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}

export interface LogoutResponseDto {
  loggedOutAt: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

