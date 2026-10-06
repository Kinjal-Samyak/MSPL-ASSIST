import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { config } from "../config";
import { prismaClient } from "../database";
import type { AuthResponseDto, AuthTokensDto, AuthUserDto, LogoutResponseDto } from "../dto/auth.dto";
import { UnauthorizedError, ValidationError } from "../errors";
import { AuthRepository, type AuthUserRecord } from "../repositories/auth.repository";
import { validateLoginPayload, validateRefreshTokenPayload } from "../validators/auth.validator";
import { AuthMapper } from "./auth.mapper";

interface TokenPayload {
  sub: string;
  role: Role;
  email: string;
  type: "access" | "refresh";
}

interface VerifiedTokenPayload {
  userId: string;
  role: Role;
  email: string;
  type: "access" | "refresh";
}

export class AuthService {
  private readonly repository: AuthRepository;

  constructor(repository?: AuthRepository) {
    this.repository = repository ?? new AuthRepository(prismaClient);
  }

  async login(payloadInput: unknown): Promise<AuthResponseDto> {
    const payload = validateLoginPayload(payloadInput);
    const user = await this.repository.findUserByEmail(payload.email);

    if (!user || !user.active || !user.passwordHash) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    if (user.lockedAt) {
      throw new UnauthorizedError("Account is locked due to repeated failed login attempts. Contact an administrator.");
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      const { locked } = await this.repository.registerFailedLogin(user.id, config.auth.maxFailedLoginAttempts);
      if (locked) {
        throw new UnauthorizedError("Account is locked due to repeated failed login attempts. Contact an administrator.");
      }
      throw new UnauthorizedError("Invalid email or password.");
    }

    await this.repository.registerSuccessfulLogin(user.id);
    const tokens = await this.issueTokens(user);
    return AuthMapper.toAuthResponse(user, tokens);
  }

  async refresh(payloadInput: unknown): Promise<AuthResponseDto> {
    const payload = validateRefreshTokenPayload(payloadInput);
    const verified = this.verifyToken(payload.refreshToken, "refresh");
    const user = await this.repository.findUserById(verified.userId);

    if (!user || !user.active || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Refresh token has expired.");
    }

    const tokenMatches = await bcrypt.compare(payload.refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const tokens = await this.issueTokens(user);
    return AuthMapper.toAuthResponse(user, tokens);
  }

  async logout(payloadInput: unknown): Promise<LogoutResponseDto> {
    const payload = validateRefreshTokenPayload(payloadInput);
    const verified = this.verifyToken(payload.refreshToken, "refresh");
    const user = await this.repository.findUserById(verified.userId);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    const tokenMatches = await bcrypt.compare(payload.refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedError("Invalid refresh token.");
    }

    await this.repository.clearRefreshToken(user.id);
    return AuthMapper.toLogoutResponse(new Date());
  }

  async getCurrentUser(userIdInput: unknown): Promise<AuthUserDto> {
    if (typeof userIdInput !== "string" || !userIdInput.trim()) {
      throw new ValidationError("Authenticated user id is required.");
    }

    const user = await this.repository.findUserById(userIdInput);
    if (!user || !user.active) {
      throw new UnauthorizedError("Authenticated user was not found.");
    }

    return AuthMapper.toAuthUser(user);
  }

  verifyAccessToken(token: string): VerifiedTokenPayload {
    return this.verifyToken(token, "access");
  }

  private async issueTokens(user: AuthUserRecord): Promise<AuthTokensDto> {
    const accessToken = this.signToken(
      { sub: user.id, role: user.role, email: user.email, type: "access" },
      config.auth.jwtAccessSecret,
      config.auth.accessTokenTtlSeconds
    );
    const refreshToken = this.signToken(
      { sub: user.id, role: user.role, email: user.email, type: "refresh" },
      config.auth.jwtRefreshSecret,
      config.auth.refreshTokenTtlSeconds
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, config.auth.bcryptSaltRounds);
    const refreshTokenExpiresAt = new Date(Date.now() + config.auth.refreshTokenTtlSeconds * 1000);
    await this.repository.updateRefreshToken(user.id, refreshTokenHash, refreshTokenExpiresAt);

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresInSeconds: config.auth.accessTokenTtlSeconds,
      refreshTokenExpiresInSeconds: config.auth.refreshTokenTtlSeconds,
    };
  }

  private signToken(payload: TokenPayload, secret: string, expiresInSeconds: number): string {
    const options: SignOptions = { expiresIn: expiresInSeconds };
    return jwt.sign(payload, secret, options);
  }

  private verifyToken(token: string, expectedType: "access" | "refresh"): VerifiedTokenPayload {
    try {
      const secret =
        expectedType === "access" ? config.auth.jwtAccessSecret : config.auth.jwtRefreshSecret;
      const decoded = jwt.verify(token, secret) as JwtPayload & {
        sub?: string;
        role?: Role;
        email?: string;
        type?: "access" | "refresh";
      };

      if (!decoded?.sub || !decoded?.role || !decoded?.email || decoded.type !== expectedType) {
        throw new UnauthorizedError("Invalid token.");
      }

      return {
        userId: decoded.sub,
        role: decoded.role,
        email: decoded.email,
        type: decoded.type,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError("Invalid token.");
    }
  }
}

