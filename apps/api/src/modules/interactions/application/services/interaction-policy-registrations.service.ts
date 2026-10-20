/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/interaction-policy-registrations.service.ts
 *
 * 🎯 Purpose:
 * Adapts minimal external callbacks while keeping registry identity and authorization private.
 *
 * 🧠 Responsibilities:
 * • creates stable registry wrappers for minimal external callbacks;
 * • projects only the explicit viewer tag and authenticated subject ID;
 * • preserves duplicate-owner and stale-unregistration identity semantics.
 *
 * 🏗️ Architecture:
 * Owned Interactions adapter; concrete dispatch/registry state remains private.
 *
 * ⚠️ Important:
 * Callback requests and returned verdicts must not carry extra target or owner fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type {
  InteractionPolicyRegistrations,
  RegisteredInteractionPolicy,
} from '../../contracts/interaction-policy-registrations.contract';
import type { InteractionTargetPolicy } from '../../domain/types/interaction-target.type';
import { InteractionPolicyRegistryService } from './interaction-policy-registry.service';

@Injectable()
export class InteractionPolicyRegistrationsService implements InteractionPolicyRegistrations {
  private readonly wrappers = new Map<
    RegisteredInteractionPolicy,
    InteractionTargetPolicy
  >();
  constructor(private readonly registry: InteractionPolicyRegistryService) {}
  register(policy: RegisteredInteractionPolicy): void {
    const wrapper =
      this.wrappers.get(policy) ??
      ({
        kind: policy.kind,
        authorize: async (target, viewer, capability) => {
          const verdict = await policy.authorize({
            targetId: target.id,
            ownerId: target.ownerId,
            viewer:
              viewer.kind === 'AUTHENTICATED'
                ? { kind: 'AUTHENTICATED', subjectId: viewer.subjectId }
                : { kind: 'GUEST' },
            capability,
          });
          return verdict.reason === undefined
            ? { allowed: verdict.allowed }
            : { allowed: verdict.allowed, reason: verdict.reason };
        },
      } satisfies InteractionTargetPolicy);
    this.registry.register(wrapper);
    this.wrappers.set(policy, wrapper);
  }
  unregister(policy: RegisteredInteractionPolicy): void {
    const wrapper = this.wrappers.get(policy);
    if (!wrapper) return;
    this.registry.unregister(wrapper);
    this.wrappers.delete(policy);
  }
}
