/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/application/authentication-presentation.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies owner boundaries, failure ordering and combined response allowlists.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UnauthorizedException } from '@nestjs/common';
import type {
  AuthenticationFlows,
  AuthenticationResult,
} from '@api/modules/auth';
import type { ViewerProfile, ViewerProfileReader } from '@api/modules/users';
import type { RegistrationTransaction } from './contracts/registration-transaction.contract';
import { AuthenticationPresentationService } from './authentication-presentation.service';

const profile: ViewerProfile = {
  id: 'subject',
  email: 'pilot@dss.test',
  username: 'pilot',
  displayName: null,
  bio: null,
  location: null,
  website: null,
  technologies: [],
  interests: [],
  avatarUrl: null,
  coverUrl: null,
  status: 'ACTIVE',
  emailVerifiedAt: null,
  lastSeenAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};
const result: AuthenticationResult = {
  subjectId: profile.id,
  tokens: { accessToken: 'access', refreshToken: 'refresh' },
};

describe('AuthenticationPresentationService', () => {
  const auth: jest.Mocked<AuthenticationFlows> = {
    enroll: jest.fn(),
    completeRegistration: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    reactivateAccount: jest.fn(),
  };
  const profiles: jest.Mocked<ViewerProfileReader> = { findById: jest.fn() };
  const registration: jest.Mocked<RegistrationTransaction> = {
    forProfile: jest.fn(),
  };
  const service = new AuthenticationPresentationService(
    auth,
    profiles,
    registration,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    profiles.findById.mockResolvedValue(profile);
    auth.login.mockResolvedValue(result);
    auth.refresh.mockResolvedValue(result);
    auth.reactivateAccount.mockResolvedValue(result);
  });

  it('binds only profile input, commits enrollment, then completes authentication', async () => {
    const store = { create: jest.fn() };
    registration.forProfile.mockReturnValue(store);
    auth.enroll.mockResolvedValue(profile.id);
    auth.completeRegistration.mockResolvedValue(result);
    await expect(
      service.register({
        email: profile.email,
        password: 'private',
        username: profile.username,
        displayName: 'Pilot',
      }),
    ).resolves.toEqual({ user: profile, tokens: result.tokens });
    expect(registration.forProfile.mock.calls[0]).toEqual([
      {
        username: 'pilot',
        displayName: 'Pilot',
      },
    ]);
    expect(auth.enroll.mock.calls[0]).toEqual([
      profile.email,
      'private',
      store,
    ]);
    expect(auth.completeRegistration.mock.calls[0]).toEqual([profile.id, {}]);
    expect(auth.enroll.mock.invocationCallOrder[0]).toBeLessThan(
      auth.completeRegistration.mock.invocationCallOrder[0],
    );
    expect(auth.completeRegistration.mock.invocationCallOrder[0]).toBeLessThan(
      profiles.findById.mock.invocationCallOrder[0],
    );
  });

  it('never completes registration or reads a profile after enrollment failure', async () => {
    const error = new Error('rollback');
    auth.enroll.mockRejectedValue(error);
    await expect(
      service.register({
        email: profile.email,
        password: 'private',
        username: profile.username,
      }),
    ).rejects.toBe(error);
    expect(auth.completeRegistration.mock.calls).toHaveLength(0);
    expect(profiles.findById.mock.calls).toHaveLength(0);
  });

  it('does not load presentation after authentication denial', async () => {
    auth.login.mockRejectedValue(new UnauthorizedException());
    await expect(
      service.login({ email: profile.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(profiles.findById.mock.calls).toHaveLength(0);
  });

  it.each(['login', 'refresh', 'reactivateAccount'] as const)(
    'fails closed on missing profile after %s',
    async (flow) => {
      profiles.findById.mockResolvedValue(null);
      const input = {
        email: profile.email,
        password: 'private',
        refreshToken: 'old',
      };
      await expect(service[flow](input)).rejects.toThrow(
        'Invalid email or password',
      );
    },
  );

  it('rejects a profile returned for a different subject', async () => {
    profiles.findById.mockResolvedValue({ ...profile, id: 'other-subject' });
    await expect(
      service.login({ email: profile.email, password: 'private' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows only explicit profile and token fields, even for an overbroad provider', async () => {
    profiles.findById.mockResolvedValue({
      ...profile,
      passwordHash: 'secret',
      futureSecret: 'secret',
    } as ViewerProfile);
    auth.login.mockResolvedValue({
      ...result,
      tokens: { ...result.tokens, internalSecret: 'secret' },
    } as AuthenticationResult);
    const response = await service.login({
      email: profile.email,
      password: 'private',
    });
    expect(response).toEqual({ user: profile, tokens: result.tokens });
    expect(Object.keys(response).sort()).toEqual(['tokens', 'user']);
    expect(response.user.technologies).not.toBe(profile.technologies);
  });

  it('propagates profile infrastructure failure without returning minted tokens', async () => {
    const error = new Error('profile reader unavailable');
    profiles.findById.mockRejectedValue(error);
    await expect(
      service.login({ email: profile.email, password: 'private' }),
    ).rejects.toBe(error);
  });

  it('preserves uniform refresh denial when profile infrastructure fails', async () => {
    profiles.findById.mockRejectedValue(new Error('database unavailable'));
    await expect(service.refresh({ refreshToken: 'old' })).rejects.toThrow(
      'Invalid email or password',
    );
  });
});
