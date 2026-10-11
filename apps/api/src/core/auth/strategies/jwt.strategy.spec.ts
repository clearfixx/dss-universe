/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/strategies/jwt.strategy.spec.ts
 *
 * 🎯 Purpose:
 * Verifies that request principals are created only after the authoritative capability accepts them.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UnauthorizedException } from '@nestjs/common';

import type { AccessSessionValidator } from '../contracts/access-session-validator.interface';
import type { JwtPayload } from '../types/jwt-payload.type';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const sessions = { isActive: jest.fn() } satisfies AccessSessionValidator;
  const strategy = new JwtStrategy(sessions);
  const payload: JwtPayload = {
    sub: 'subject-1',
    ver: 3,
    sid: 'session-1',
    email: 'astro@dss.test',
    username: 'astro',
    roles: ['user'],
    permissions: [],
  };

  beforeEach(() => jest.resetAllMocks());

  it('preserves request context and sends only session evidence to the capability', async () => {
    sessions.isActive.mockResolvedValue(true);
    await expect(strategy.validate(payload)).resolves.toEqual({
      id: payload.sub,
      sessionId: payload.sid,
      email: payload.email,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions,
    });
    expect(sessions.isActive).toHaveBeenCalledWith({
      subjectId: payload.sub,
      sessionId: payload.sid,
      authVersion: payload.ver,
    });
  });

  it('rejects a denied session without creating a principal', async () => {
    sessions.isActive.mockResolvedValue(false);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not create a principal when authoritative validation fails', async () => {
    sessions.isActive.mockRejectedValue(new Error('state unavailable'));
    await expect(strategy.validate(payload)).rejects.toThrow(
      'state unavailable',
    );
  });
});
