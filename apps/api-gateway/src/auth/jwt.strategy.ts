import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
}

export interface AuthenticatedActor {
  id: string;
  email: string;
  name?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      // Failing at boot beats failing open on the first request.
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: config.get<string>('JWT_ISSUER', 'zurich-portal-gateway'),
      audience: config.get<string>('JWT_AUDIENCE', 'zurich-portal'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedActor {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Malformed token');
    }
    return { id: payload.sub, email: payload.email, name: payload.name };
  }
}
