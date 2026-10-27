/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root Presentation Verification
 * 📄 File: apps/api/src/composition/owner-failure-presentation.spec.ts
 *
 * 🎯 Purpose:
 * Proves owner failure conversion is attached to every affected transport path.
 *
 * 🧠 Responsibilities:
 * • exercises asynchronous application rejection at actual entry points;
 * • preserves unknown failures instead of normalizing them into client errors.
 *
 * 🏗️ Architecture:
 * Test-only resolver/controller assembly with controlled application boundaries.
 *
 * ⚠️ Important:
 * These placement controls complement, not replace, real authenticated HTTP tests.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, type Provider, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthenticatedRequest, AuthenticatedUser } from '../core/auth';
import type { GraphqlContext } from '../core/graphql';
import { AuthenticationController } from './identity/presentation/authentication.controller';
import { AuthenticationResolver } from './identity/presentation/graphql/authentication.resolver';
import { AuthenticationPresentationService } from './identity/application/authentication-presentation.service';
import { ProfileAssetResolver } from './profile-assets/presentation/graphql/profile-asset.resolver';
import { ProfileAssetPresentationService } from './profile-assets/application/profile-asset-presentation.service';
import { AuthResolver } from '../modules/auth/presentation/graphql/resolvers/auth.resolver';
import { AuthService } from '../modules/auth/application/services/auth.service';
import { TwoFactorResolver } from '../modules/auth/presentation/graphql/resolvers/two-factor.resolver';
import { TwoFactorService } from '../modules/auth/application/services/two-factor.service';
import { UsersResolver } from '../modules/users/presentation/graphql/resolvers/users.resolver';
import { UsersService } from '../modules/users/application/services/users.service';
import { ProfileCompletionService } from '../modules/users/application/services/profile-completion.service';
import { MediaResolver } from '../modules/media/presentation/graphql/resolvers/media.resolver';
import { MediaAccessService } from '../modules/media/application/services/media-access.service';
import { InvalidCredentialsException } from '../modules/auth/domain/exceptions/invalid-credentials.exception';
import { EmailAlreadyExistsException } from '../modules/auth/domain/exceptions/email-already-exists.exception';
import { TwoFactorRequiredException } from '../modules/auth/domain/exceptions/two-factor-required.exception';
import { UserNotFoundException } from '../modules/users/domain/exceptions/user-not-found.exception';
import { InvalidAvatarMediaException } from '../modules/media/domain/exceptions/invalid-avatar-media.exception';
import { MediaAccessForbiddenException } from '../modules/media/domain/exceptions/media-access-forbidden.exception';

async function assemble<T>(entry: Type<T>, providers: Provider[]): Promise<T> {
  const module = await Test.createTestingModule({
    providers: [entry, ...providers],
  })
    .useMocker(() => ({}))
    .compile();
  return module.get(entry);
}
function rejection(failure: unknown) {
  return jest.fn(async () => {
    await Promise.resolve();
    throw failure;
  });
}
const actor = {
  id: 'synthetic-subject',
  sessionId: 'session',
} as AuthenticatedUser;
const request = {
  get: () => 'synthetic-agent',
  ip: '127.0.0.1',
} as unknown as AuthenticatedRequest;
const context = { req: request } as GraphqlContext;
const credentials = {
  email: 'synthetic@dss.invalid',
  username: 'synthetic',
  displayName: 'Synthetic pilot',
  password: 'not-used',
  currentPassword: 'not-used',
  newPassword: 'not-used',
};

type Boundary = {
  name: string;
  invoke: (failure: unknown) => Promise<unknown>;
  known: () => Error;
  status: number;
};
const boundaries: Boundary[] = [];
for (const method of ['register', 'login'] as const) {
  boundaries.push({
    name: `REST identity ${method}`,
    known: () => new InvalidCredentialsException(),
    status: 401,
    invoke: async (failure) => {
      const controller = await assemble(AuthenticationController, [
        {
          provide: AuthenticationPresentationService,
          useValue: { [method]: rejection(failure) },
        },
      ]);
      return controller[method](credentials, request);
    },
  });
}
for (const method of ['register', 'login', 'reactivateAccount'] as const) {
  boundaries.push({
    name: `GraphQL identity ${method}`,
    known: () => new EmailAlreadyExistsException(),
    status: 409,
    invoke: async (failure) => {
      const resolver = await assemble(AuthenticationResolver, [
        {
          provide: AuthenticationPresentationService,
          useValue: { [method]: rejection(failure) },
        },
      ]);
      return resolver[method](credentials, context);
    },
  });
}
for (const [method, operation] of [
  ['deactivateAccount', 'deactivateAccount'],
  ['changeViewerEmail', 'changeEmail'],
  ['changeViewerPassword', 'changePassword'],
] as const) {
  boundaries.push({
    name: `Auth ${method}`,
    known: () => new InvalidCredentialsException(),
    status: 401,
    invoke: async (failure) => {
      const resolver = await assemble(AuthResolver, [
        { provide: AuthService, useValue: { [operation]: rejection(failure) } },
      ]);
      return resolver[method](actor, credentials);
    },
  });
}
boundaries.push({
  name: 'Auth disable two-factor',
  known: () => new TwoFactorRequiredException(),
  status: 401,
  invoke: async (failure) => {
    const resolver = await assemble(TwoFactorResolver, [
      { provide: TwoFactorService, useValue: { disable: rejection(failure) } },
    ]);
    return resolver.disableViewerTwoFactor(actor, {
      password: 'not-used',
      code: 'not-used',
    });
  },
});
for (const [method, operation] of [
  ['setViewerAvatar', 'assignAvatar'],
  ['removeViewerAvatar', 'removeAvatar'],
  ['setViewerCover', 'assignCover'],
  ['removeViewerCover', 'removeCover'],
] as const) {
  boundaries.push({
    name: `Root assets ${method}`,
    known: () => new InvalidAvatarMediaException(),
    status: 400,
    invoke: async (failure) => {
      const resolver = await assemble(ProfileAssetResolver, [
        {
          provide: ProfileAssetPresentationService,
          useValue: { [operation]: rejection(failure) },
        },
      ]);
      if (method === 'setViewerAvatar' || method === 'setViewerCover')
        return resolver[method](actor, 'synthetic-media');
      return resolver[method](actor);
    },
  });
}
for (const method of [
  'viewer',
  'updateViewerProfile',
  'user',
  'userByUsername',
  'viewerProfileCompletion',
] as const) {
  boundaries.push({
    name: `Users ${method}`,
    known: () => new UserNotFoundException(),
    status: 404,
    invoke: async (failure) => {
      const resolver = await assemble(UsersResolver, [
        {
          provide: UsersService,
          useValue: {
            getById: rejection(failure),
            updateProfile: rejection(failure),
            getPublicById: rejection(failure),
            getPublicByUsername: rejection(failure),
          },
        },
        {
          provide: ProfileCompletionService,
          useValue: { getForUser: rejection(failure) },
        },
      ]);
      if (method === 'viewer' || method === 'viewerProfileCompletion')
        return resolver[method](actor);
      if (method === 'updateViewerProfile')
        return resolver.updateViewerProfile(actor, {});
      if (method === 'user') return resolver.user('synthetic-subject', actor);
      return resolver.userByUsername('synthetic', actor);
    },
  });
}
boundaries.push({
  name: 'Media access URL',
  known: () => new MediaAccessForbiddenException(),
  status: 403,
  invoke: async (failure) => {
    const resolver = await assemble(MediaResolver, [
      { provide: MediaAccessService, useValue: { issue: rejection(failure) } },
    ]);
    return resolver.mediaAccessUrl(actor, 'synthetic-media', 'original');
  },
});

describe.each(boundaries)(
  '$name awaited presentation boundary',
  ({ invoke, known, status }) => {
    it('converts the owner failure after asynchronous rejection', async () => {
      await expect(invoke(known())).rejects.toMatchObject({ status });
    });
    it.each([
      new Error('synthetic infrastructure failure'),
      new BadRequestException('existing envelope'),
      { name: 'UserNotFoundException', message: 'User not found' },
    ])('preserves unknown failure identity: %p', async (failure) => {
      await expect(invoke(failure)).rejects.toBe(failure);
    });
  },
);
