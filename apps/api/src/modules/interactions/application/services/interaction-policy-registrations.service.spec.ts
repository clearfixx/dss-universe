/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Policy Tests
 * 📄 File: apps/api/src/modules/interactions/application/services/interaction-policy-registrations.service.spec.ts
 *
 * 🎯 Purpose:
 * Proves minimal callbacks, duplicate ownership, stable identity and fail-closed unregistration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { InteractionPolicyRegistryService } from './interaction-policy-registry.service';
import { InteractionPolicyRegistrationsService } from './interaction-policy-registrations.service';
import type { RegisteredInteractionPolicy } from '../../contracts/interaction-policy-registrations.contract';
import type { InteractionTarget } from '../../domain/types/interaction-target.type';
import type { InteractionViewer } from '../../domain/types/interaction-viewer.type';

describe('InteractionPolicyRegistrationsService', () => {
  const viewer = { kind: 'AUTHENTICATED', subjectId: 'viewer' } as const;
  const target: InteractionTarget = {
    id: 'target',
    ownerId: 'owner',
    kind: 'test',
    ownerModule: 'module',
    ownerType: 'type',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let registry: InteractionPolicyRegistryService;
  let registrations: InteractionPolicyRegistrationsService;
  beforeEach(() => {
    registry = new InteractionPolicyRegistryService();
    registrations = new InteractionPolicyRegistrationsService(registry);
  });
  it('passes exactly target/owner/viewer IDs and capability, without full target fields', async () => {
    const policy = {
      kind: 'test',
      authorize: jest
        .fn()
        .mockResolvedValue({ allowed: true, secret: 'must not escape' }),
    } satisfies RegisteredInteractionPolicy;
    registrations.register(policy);
    expect(await registry.authorize(target, viewer, 'READ')).toEqual({
      allowed: true,
    });
    expect(policy.authorize.mock.calls).toEqual([
      [
        {
          targetId: 'target',
          ownerId: 'owner',
          viewer,
          capability: 'READ',
        },
      ],
    ]);
  });
  it.each([{ kind: 'GUEST' }, viewer] as const)(
    'allowlists the viewer projection for %p',
    async (context) => {
      const policy = {
        kind: 'test',
        authorize: jest.fn().mockResolvedValue({ allowed: true }),
      } satisfies RegisteredInteractionPolicy;
      registrations.register(policy);
      const noisyViewer = { ...context, secret: 'must not escape' };
      await registry.authorize(target, noisyViewer, 'READ');
      expect(policy.authorize.mock.calls).toEqual([
        [
          {
            targetId: 'target',
            ownerId: 'owner',
            viewer: context,
            capability: 'READ',
          },
        ],
      ]);
    },
  );
  it.each([
    undefined,
    null,
    'anonymous',
    {},
    { kind: 'UNKNOWN' },
    { kind: 'AUTHENTICATED' },
    { kind: 'AUTHENTICATED', subjectId: '' },
    { kind: 'AUTHENTICATED', subjectId: '   ' },
  ])(
    'fails closed for malformed viewer %p before dispatch',
    async (context) => {
      const policy = {
        kind: 'test',
        authorize: jest.fn().mockResolvedValue({ allowed: true }),
      } satisfies RegisteredInteractionPolicy;
      registrations.register(policy);
      expect(
        await registry.authorize(target, context as InteractionViewer, 'READ'),
      ).toEqual({ allowed: false, reason: 'VIEWER_CONTEXT_INVALID' });
      expect(policy.authorize).not.toHaveBeenCalled();
    },
  );
  it('retains same-policy identity across duplicate registration', async () => {
    const policy = {
      kind: 'test',
      authorize: jest.fn().mockResolvedValue({ allowed: true }),
    } satisfies RegisteredInteractionPolicy;
    registrations.register(policy);
    registrations.register(policy);
    registrations.unregister(policy);
    registrations.unregister(policy);
    expect(await registry.authorize(target, viewer, 'READ')).toEqual({
      allowed: false,
      reason: 'OWNER_POLICY_UNAVAILABLE',
    });
  });
  it('rejects competing ownership without replacing the original and ignores stale unregister', async () => {
    const first = {
      kind: 'test',
      authorize: jest.fn().mockResolvedValue({ allowed: true }),
    } satisfies RegisteredInteractionPolicy;
    const second = {
      kind: 'test',
      authorize: jest
        .fn()
        .mockResolvedValue({ allowed: false, reason: 'SECOND' }),
    } satisfies RegisteredInteractionPolicy;
    registrations.register(first);
    expect(() => registrations.register(second)).toThrow(
      'Interaction policy already owns kind test.',
    );
    expect(await registry.authorize(target, viewer, 'READ')).toEqual({
      allowed: true,
    });
    registrations.unregister(first);
    registrations.register(second);
    registrations.unregister(first);
    expect(await registry.authorize(target, viewer, 'READ')).toEqual({
      allowed: false,
      reason: 'SECOND',
    });
  });
  it('propagates owner failures without an allow fallback', async () => {
    registrations.register({
      kind: 'test',
      authorize: () => Promise.reject(new Error('Owner unavailable')),
    });
    await expect(registry.authorize(target, viewer, 'READ')).rejects.toThrow(
      'Owner unavailable',
    );
  });
});
