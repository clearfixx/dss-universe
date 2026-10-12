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
import type { RequestAccessReader } from '../contracts/request-access-reader.interface';
import type { JwtPayload } from '../types/jwt-payload.type';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const sessions = { isActive: jest.fn() } satisfies AccessSessionValidator;
  const access = { readForSubject: jest.fn() } satisfies RequestAccessReader;
  const strategy = new JwtStrategy(sessions, access);
  const payload: JwtPayload = {
    sub: 'subject-1',
    ver: 3,
    sid: 'session-1',
    email: 'astro@dss.test',
    username: 'astro',
    roles: ['user'],
    permissions: [],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    access.readForSubject.mockResolvedValue({
      roles: ['current-role'],
      permissions: ['current.read'],
    });
  });

  it('preserves request context and sends only session evidence to the capability', async () => {
    sessions.isActive.mockResolvedValue(true);
    await expect(strategy.validate(payload)).resolves.toEqual({
      id: payload.sub,
      sessionId: payload.sid,
      email: payload.email,
      username: payload.username,
      roles: ['current-role'],
      permissions: ['current.read'],
    });
    expect(sessions.isActive).toHaveBeenCalledWith({
      subjectId: payload.sub,
      sessionId: payload.sid,
      authVersion: payload.ver,
    });
    expect(access.readForSubject.mock.calls).toEqual([[payload.sub]]);
  });

  it('rejects a denied session without creating a principal', async () => {
    sessions.isActive.mockResolvedValue(false);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(access.readForSubject).not.toHaveBeenCalled();
  });

  it('does not create a principal when authoritative validation fails', async () => {
    sessions.isActive.mockRejectedValue(new Error('state unavailable'));
    await expect(strategy.validate(payload)).rejects.toThrow(
      'state unavailable',
    );
    expect(access.readForSubject).not.toHaveBeenCalled();
  });

  it('rejects access-read failure even when JWT contains the required grant', async () => {
    sessions.isActive.mockResolvedValue(true);
    access.readForSubject.mockRejectedValue(new Error('access unavailable'));
    await expect(
      strategy.validate({ ...payload, permissions: ['current.read'] }),
    ).rejects.toThrow('access unavailable');
  });

  it('refreshes access on every validation without mutating token or provider values', async () => {
    sessions.isActive.mockResolvedValue(true);
    const current = { roles: ['current-role'], permissions: ['current.read'] };
    access.readForSubject
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ roles: [], permissions: [] });
    const token = {
      ...payload,
      roles: ['stale-admin'],
      permissions: ['stale.manage'],
    };
    const first = await strategy.validate(token);
    first.roles.push('request-local-role');
    first.permissions.push('request-local-permission');
    expect(current).toEqual({
      roles: ['current-role'],
      permissions: ['current.read'],
    });
    const second = await strategy.validate(token);
    expect(second.roles).toEqual([]);
    expect(second.permissions).toEqual([]);
    expect(access.readForSubject).toHaveBeenCalledTimes(2);
    expect(token.roles).toEqual(['stale-admin']);
    expect(token.permissions).toEqual(['stale.manage']);
  });
});
