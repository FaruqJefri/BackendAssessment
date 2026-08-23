import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';

import { IssueTokenDto } from './dto/issue-token.dto';

export interface IssuedToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly serviceApiKey: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('SERVICE_API_KEY');
    if (!key) {
      throw new Error('SERVICE_API_KEY is not configured');
    }
    this.serviceApiKey = key;
    this.ttlSeconds = Number(this.config.get('JWT_TTL_SECONDS', 900));
  }

  /**
   * Constant-time comparison of the presented service key. Hashing first makes
   * the compared buffers equal length, so a mismatched key length cannot be
   * distinguished from a mismatched key.
   */
  assertServiceKey(presented?: string): void {
    if (!presented) {
      throw new UnauthorizedException('Missing service credentials');
    }

    const a = createHash('sha256').update(presented).digest();
    const b = createHash('sha256').update(this.serviceApiKey).digest();

    if (!timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid service credentials');
    }
  }

  issueToken(actor: IssueTokenDto): IssuedToken {
    const accessToken = this.jwt.sign(
      { email: actor.email, name: actor.name },
      {
        subject: actor.email,
        expiresIn: this.ttlSeconds,
        issuer: this.config.get<string>('JWT_ISSUER', 'zurich-portal-gateway'),
        audience: this.config.get<string>('JWT_AUDIENCE', 'zurich-portal'),
      },
    );

    return { accessToken, tokenType: 'Bearer', expiresIn: this.ttlSeconds };
  }
}
