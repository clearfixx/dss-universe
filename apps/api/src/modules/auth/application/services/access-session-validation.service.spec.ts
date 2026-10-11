/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/access-session-validation.service.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes session denial, revocation and access-version behavior independently of storage.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AccessSessionClaim } from '@api/core/auth';
import type { AccessSessionState } from '../../domain/types/access-session-state.type';
import type { AccessSessionRepository } from '../../domain/repositories/access-session.repository.interface';
import { AccessSessionValidationService } from './access-session-validation.service';

describe('AccessSessionValidationService', () => {
  const repository = { findById: jest.fn() } satisfies AccessSessionRepository;
  const service = new AccessSessionValidationService(repository);
  const claim: AccessSessionClaim = {
    subjectId: 'subject-1',
    sessionId: 'session-1',
    authVersion: 2,
  };
  const now = new Date('2026-10-11T12:00:00Z');
  const state: AccessSessionState = {
    subjectId: claim.subjectId,
    revokedAt: null,
    expiresAt: new Date(now.getTime() + 1000),
    accountActive: true,
    authVersion: claim.authVersion,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    repository.findById.mockResolvedValue(state);
  });
  afterEach(() => jest.useRealTimers());

  it('accepts matching, active, unexpired state', async () => {
    await expect(service.isActive(claim)).resolves.toBe(true);
    expect(repository.findById).toHaveBeenCalledWith(claim.sessionId);
  });
  it('rejects a missing or deleted session', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.isActive(claim)).resolves.toBe(false);
  });
  const deniedStates: Array<[string, Partial<AccessSessionState>]> = [
    ['another subject', { subjectId: 'subject-2' }],
    ['revoked session', { revokedAt: now }],
    ['expired session', { expiresAt: new Date(now.getTime() - 1) }],
    ['expiry boundary', { expiresAt: now }],
    ['inactive account', { accountActive: false }],
    ['rotated access version', { authVersion: claim.authVersion + 1 }],
  ];
  it.each(deniedStates)('rejects %s', async (_name, change) => {
    repository.findById.mockResolvedValue({ ...state, ...change });
    await expect(service.isActive(claim)).resolves.toBe(false);
  });
  const invalidClaims: AccessSessionClaim[] = [
    { ...claim, subjectId: '' },
    { ...claim, sessionId: '' },
    { ...claim, authVersion: -1 },
    { ...claim, authVersion: 1.5 },
    { ...claim, authVersion: Number.NaN },
    { ...claim, sessionId: undefined as unknown as string },
  ];
  it.each(invalidClaims)(
    'rejects malformed claims %j before storage',
    async (input) => {
      await expect(service.isActive(input)).resolves.toBe(false);
      expect(repository.findById).not.toHaveBeenCalled();
    },
  );
  it('reads state again on every request and observes immediate revocation', async () => {
    repository.findById
      .mockResolvedValueOnce(state)
      .mockResolvedValueOnce({ ...state, revokedAt: now });
    await expect(service.isActive(claim)).resolves.toBe(true);
    await expect(service.isActive(claim)).resolves.toBe(false);
    expect(repository.findById).toHaveBeenCalledTimes(2);
  });
  it('propagates repository failure without accepting the session', async () => {
    repository.findById.mockRejectedValue(new Error('database unavailable'));
    await expect(service.isActive(claim)).rejects.toThrow(
      'database unavailable',
    );
  });
});
