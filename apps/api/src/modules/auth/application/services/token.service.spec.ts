/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/token.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies opaque access issuance and unchanged private refresh-token signing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { AccessTokenIssuer } from '../../contracts/access-token-issuer.contract';
import type { RefreshTokenClaims } from '../types/refresh-token-claims.type';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const subject = { id: 'subject-1', email: 'auth@dss.test', authVersion: 7 };
  const issuer: jest.Mocked<AccessTokenIssuer> = { issue: jest.fn() };
  const signAsync = jest.fn<Promise<string>, [unknown, unknown]>();
  const verifyAsync = jest.fn<Promise<RefreshTokenClaims>, [string, unknown]>();
  const get = jest.fn<string | undefined, [string]>();
  const service = new TokenService(
    { signAsync, verifyAsync } as unknown as JwtService,
    { get } as unknown as ConfigService,
    issuer,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    get.mockReturnValue('synthetic-refresh-secret');
    issuer.issue.mockResolvedValue('access-token');
    signAsync.mockResolvedValue('refresh-token');
  });

  it('passes only Auth-owned facts to access issuance despite runtime extras', async () => {
    const runtimeSubject = {
      ...subject,
      username: 'not-auth-owned',
      passwordHash: 'never-copy',
    };
    expect(await service.generateTokens(runtimeSubject, 'session-1')).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(issuer.issue.mock.calls).toEqual([[subject, 'session-1']]);
    expect(signAsync.mock.calls).toEqual([
      [
        { sub: 'subject-1', ver: 7, sid: 'session-1' },
        { secret: 'synthetic-refresh-secret', expiresIn: '7d' },
      ],
    ]);
  });

  it('does not return a token pair when access composition fails', async () => {
    const failure = new Error('access issuance unavailable');
    issuer.issue.mockRejectedValue(failure);
    await expect(service.generateTokens(subject, 'session-1')).rejects.toBe(
      failure,
    );
  });

  it('refuses refresh signing without its secret', async () => {
    get.mockReturnValue(undefined);
    await expect(
      service.signRefreshToken(subject, 'session-1'),
    ).rejects.toThrow('JWT_REFRESH_SECRET is not configured.');
    expect(signAsync.mock.calls).toHaveLength(0);
  });

  it('verifies with the refresh secret and returns only refresh identity facts', async () => {
    const runtimeClaims = {
      sub: 'subject-1',
      sid: 'session-1',
      ver: 7,
      username: 'not-a-refresh-fact',
      roles: ['never-copy'],
    };
    verifyAsync.mockResolvedValue(runtimeClaims);
    expect(await service.verifyRefreshToken('refresh-token')).toEqual({
      sub: 'subject-1',
      sid: 'session-1',
      ver: 7,
    });
    expect(verifyAsync.mock.calls).toEqual([
      [
        'refresh-token',
        {
          secret: 'synthetic-refresh-secret',
        },
      ],
    ]);
  });
});
