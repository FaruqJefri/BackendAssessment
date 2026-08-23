import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthService } from './auth.service';

const CONFIG: Record<string, unknown> = {
  SERVICE_API_KEY: 'super-secret-service-key',
  JWT_SECRET: 'test-jwt-secret-value-at-least-32-chars',
  JWT_TTL_SECONDS: 900,
  JWT_ISSUER: 'zurich-portal-gateway',
  JWT_AUDIENCE: 'zurich-portal',
};

async function build(overrides: Record<string, unknown> = {}) {
  const merged = { ...CONFIG, ...overrides };

  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: JwtService,
        useValue: new JwtService({ secret: merged.JWT_SECRET as string }),
      },
      {
        provide: ConfigService,
        useValue: {
          get: (key: string, fallback?: unknown) => (key in merged ? merged[key] : fallback),
        },
      },
    ],
  }).compile();

  return moduleRef.get(AuthService);
}

describe('AuthService', () => {
  it('refuses to start without a service key configured', async () => {
    await expect(build({ SERVICE_API_KEY: undefined })).rejects.toThrow(
      'SERVICE_API_KEY is not configured',
    );
  });

  it('accepts the configured service key', async () => {
    const auth = await build();
    expect(() => auth.assertServiceKey('super-secret-service-key')).not.toThrow();
  });

  it.each([
    ['a wrong key', 'wrong-key'],
    ['a prefix of the real key', 'super-secret'],
    ['an empty string', ''],
    ['nothing at all', undefined],
  ])('rejects %s', async (_label, presented) => {
    const auth = await build();
    expect(() => auth.assertServiceKey(presented)).toThrow(UnauthorizedException);
  });

  it('issues a token carrying the acting user identity', async () => {
    const auth = await build();
    const jwt = new JwtService({ secret: CONFIG.JWT_SECRET as string });

    const issued = auth.issueToken({ email: 'ada@example.com', name: 'Ada' });
    const decoded = jwt.verify(issued.accessToken, {
      secret: CONFIG.JWT_SECRET as string,
      issuer: 'zurich-portal-gateway',
      audience: 'zurich-portal',
    });

    expect(issued.tokenType).toBe('Bearer');
    expect(issued.expiresIn).toBe(900);
    expect(decoded.sub).toBe('ada@example.com');
    expect(decoded.email).toBe('ada@example.com');
    expect(decoded.name).toBe('Ada');
  });

  it('issues a token that expires', async () => {
    const auth = await build();
    const jwt = new JwtService({ secret: CONFIG.JWT_SECRET as string });

    const decoded = jwt.decode(auth.issueToken({ email: 'ada@example.com' }).accessToken) as {
      exp: number;
      iat: number;
    };

    expect(decoded.exp - decoded.iat).toBe(900);
  });
});
