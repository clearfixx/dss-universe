/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Composition Tests
 * 📄 File: apps/api/src/composition/interaction-policies/interaction-owner-bindings.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins fixed owner bindings, minimal field translation, cleanup and private registry visibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import {
  InteractionsModule,
  INTERACTION_POLICY_REGISTRATIONS,
  type InteractionPolicyRegistrations,
  type InteractionViewer,
} from '@api/modules/interactions';
import {
  type NewsInteractionDecisions,
  NewsModule,
  NEWS_INTERACTION_DECISIONS,
} from '@api/modules/news';
import {
  type ProfileWallInteractionDecisions,
  UsersModule,
  PROFILE_WALL_INTERACTION_DECISIONS,
} from '@api/modules/users';
import { InteractionPolicyRegistryService } from '../../modules/interactions/application/services/interaction-policy-registry.service';
import { InteractionOwnerBindingsService } from './interaction-owner-bindings.service';

describe('InteractionOwnerBindingsService', () => {
  const news = {
    authorize: jest
      .fn()
      .mockResolvedValue({ allowed: true, secret: 'not public' }),
  } satisfies jest.Mocked<NewsInteractionDecisions>;
  const wall = {
    authorize: jest.fn().mockResolvedValue({
      allowed: false,
      reason: 'PROFILE_PRIVATE',
      secret: 'not public',
    }),
  } satisfies jest.Mocked<ProfileWallInteractionDecisions>;
  let registrations: jest.Mocked<InteractionPolicyRegistrations>;
  let service: InteractionOwnerBindingsService;
  beforeEach(() => {
    jest.clearAllMocks();
    registrations = { register: jest.fn(), unregister: jest.fn() };
    service = new InteractionOwnerBindingsService(registrations, news, wall);
    service.onModuleInit();
  });
  function policies() {
    return registrations.register.mock.calls.map(([policy]) => policy);
  }
  it('registers fixed kinds and unregisters the exact same immutable callback objects', () => {
    expect(policies().map((policy) => policy.kind)).toEqual([
      'news.article',
      'users.profile-wall-post',
    ]);
    expect(policies().every(Object.isFrozen)).toBe(true);
    service.onModuleDestroy();
    expect(registrations.unregister.mock.calls).toEqual([
      [policies()[1]],
      [policies()[0]],
    ]);
  });
  it.each(['READ', 'COMMENT', 'REACT', 'BOOKMARK', 'SHARE'] as const)(
    'maps %s to only News-required fields and strips extra verdict fields',
    async (capability) => {
      const result = await policies()[0].authorize({
        targetId: 'target',
        ownerId: 'article',
        viewer: { kind: 'AUTHENTICATED', subjectId: 'viewer' },
        capability,
      });
      expect(result).toEqual({ allowed: true });
      expect(news.authorize.mock.calls).toEqual([
        [
          {
            interactionTargetId: 'target',
            articleId: 'article',
            viewer: 'AUTHENTICATED',
            capability,
          },
        ],
      ]);
    },
  );
  it('passes only post/target/viewer IDs to Users and preserves denial reason', async () => {
    expect(
      await policies()[1].authorize({
        targetId: 'target',
        ownerId: 'post',
        viewer: { kind: 'AUTHENTICATED', subjectId: 'viewer' },
        capability: 'REACT',
      }),
    ).toEqual({ allowed: false, reason: 'PROFILE_PRIVATE' });
    expect(wall.authorize.mock.calls).toEqual([
      [{ interactionTargetId: 'target', postId: 'post', viewerId: 'viewer' }],
    ]);
  });
  it('rejects an unknown/prototype capability before calling News', async () => {
    await expect(
      policies()[0].authorize({
        targetId: 'target',
        ownerId: 'article',
        viewer: { kind: 'AUTHENTICATED', subjectId: 'viewer' },
        capability: 'toString' as 'READ',
      }),
    ).rejects.toThrow('Unsupported News interaction capability.');
    expect(news.authorize.mock.calls).toEqual([]);
  });
  it('propagates owner exceptions without a successful verdict', async () => {
    news.authorize.mockRejectedValueOnce(new Error('Owner unavailable'));
    await expect(
      policies()[0].authorize({
        targetId: 'target',
        ownerId: 'article',
        viewer: { kind: 'AUTHENTICATED', subjectId: 'viewer' },
        capability: 'READ',
      }),
    ).rejects.toThrow('Owner unavailable');
  });
  it('cleans up a partial initialization when the second kind is already owned', () => {
    const failed: jest.Mocked<InteractionPolicyRegistrations> = {
      register: jest.fn(),
      unregister: jest.fn(),
    };
    failed.register
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('Duplicate owner');
      });
    const binding = new InteractionOwnerBindingsService(failed, news, wall);
    expect(() => binding.onModuleInit()).toThrow('Duplicate owner');
    expect(failed.unregister.mock.calls).toEqual([
      [failed.register.mock.calls[0][0]],
    ]);
  });
  it('projects guest state to News and preserves the isolated legacy Wall guest mapping', async () => {
    const request = {
      targetId: 'target',
      ownerId: 'owner',
      viewer: { kind: 'GUEST' } as const,
      capability: 'READ' as const,
    };
    await policies()[0].authorize(request);
    await policies()[1].authorize(request);
    expect(news.authorize.mock.calls).toEqual([
      [
        {
          articleId: 'owner',
          interactionTargetId: 'target',
          viewer: 'GUEST',
          capability: 'READ',
        },
      ],
    ]);
    expect(wall.authorize.mock.calls).toEqual([
      [
        {
          postId: 'owner',
          interactionTargetId: 'target',
          viewerId: 'anonymous',
        },
      ],
    ]);
  });
  it.each([
    undefined,
    null,
    'anonymous',
    {},
    { kind: 'UNKNOWN' },
    { kind: 'AUTHENTICATED', subjectId: '' },
  ])(
    'rejects malformed viewer %p before either owner callback',
    async (viewer) => {
      for (const policy of policies()) {
        await expect(
          policy.authorize({
            targetId: 'target',
            ownerId: 'owner',
            viewer: viewer as InteractionViewer,
            capability: 'READ',
          }),
        ).rejects.toThrow('Unsupported interaction viewer context.');
      }
      expect(news.authorize).not.toHaveBeenCalled();
      expect(wall.authorize).not.toHaveBeenCalled();
    },
  );
  it('keeps concrete registry and owner policies private, exporting only needed tokens', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InteractionsModule,
    ) as unknown[];
    expect(exports).not.toContain(InteractionPolicyRegistryService);
    expect(exports).toContain(INTERACTION_POLICY_REGISTRATIONS);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, NewsModule) as unknown[],
    ).toContain(NEWS_INTERACTION_DECISIONS);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, UsersModule) as unknown[],
    ).toContain(PROFILE_WALL_INTERACTION_DECISIONS);
  });
});
