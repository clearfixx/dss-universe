/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/authoritative-request-access-reader.spec.ts
 *
 * 🎯 Purpose:
 * Verifies request access allowlisting, value isolation and authority failure propagation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { SubjectAccessReader } from '@api/core/authorization';
import { AuthoritativeRequestAccessReader } from './authoritative-request-access-reader';

describe('AuthoritativeRequestAccessReader', () => {
  const access = {
    getAccessProfileByUserId: jest.fn(),
  } satisfies SubjectAccessReader;
  const reader = new AuthoritativeRequestAccessReader(access);
  beforeEach(() => jest.resetAllMocks());

  it('passes only the subject ID and returns copied allowlisted access arrays', async () => {
    const providerView = {
      roles: ['user'],
      permissions: ['test.read'],
      passwordHash: 'must-not-cross',
      email: 'private@example.com',
    };
    access.getAccessProfileByUserId.mockResolvedValue(providerView);
    const result = await reader.readForSubject('subject');
    expect(access.getAccessProfileByUserId.mock.calls).toEqual([['subject']]);
    expect(result).toEqual({ roles: ['user'], permissions: ['test.read'] });
    result.roles.push('local');
    result.permissions.push('local.read');
    expect(providerView.roles).toEqual(['user']);
    expect(providerView.permissions).toEqual(['test.read']);
  });

  it('propagates authority failure instead of returning stale or empty access', async () => {
    access.getAccessProfileByUserId.mockRejectedValue(
      new Error('authority offline'),
    );
    await expect(reader.readForSubject('subject')).rejects.toThrow(
      'authority offline',
    );
  });
});
