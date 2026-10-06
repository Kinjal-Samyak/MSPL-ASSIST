import type { AuthResponseDto, AuthTokensDto, AuthUserDto, LogoutResponseDto } from "../dto/auth.dto";
import type { AuthUserRecord } from "../repositories/auth.repository";

export class AuthMapper {
  static toAuthUser(user: AuthUserRecord): AuthUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  static toAuthResponse(user: AuthUserRecord, tokens: AuthTokensDto): AuthResponseDto {
    return {
      user: AuthMapper.toAuthUser(user),
      tokens,
    };
  }

  static toLogoutResponse(at: Date): LogoutResponseDto {
    return { loggedOutAt: at.toISOString() };
  }
}

