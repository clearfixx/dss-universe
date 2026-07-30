/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/interaction-policy-registry.service.ts
 *
 * 🎯 Purpose:
 * Routes capability decisions back to the module that owns each target kind.
 *
 * 🧠 Responsibilities:
 * • registers exactly one policy per stable target kind;
 * • rejects duplicate policy ownership;
 * • fails closed when an owning module has no active policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import type {
  InteractionCapability,
  InteractionTarget,
  InteractionTargetPolicy,
} from '../../domain/types/interaction-target.type';

@Injectable()
export class InteractionPolicyRegistryService {
  private readonly policies = new Map<string, InteractionTargetPolicy>();

  register(policy: InteractionTargetPolicy): void {
    const existing = this.policies.get(policy.kind);
    if (existing && existing !== policy) {
      throw new Error(`Interaction policy already owns kind ${policy.kind}.`);
    }
    this.policies.set(policy.kind, policy);
  }

  unregister(policy: InteractionTargetPolicy): void {
    if (this.policies.get(policy.kind) === policy) {
      this.policies.delete(policy.kind);
    }
  }

  async authorize(
    target: InteractionTarget,
    actorId: string,
    capability: InteractionCapability,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const policy = this.policies.get(target.kind);
    if (!policy) {
      return { allowed: false, reason: 'OWNER_POLICY_UNAVAILABLE' };
    }
    return policy.authorize(target, actorId, capability);
  }
}

/**
 * If nobody owns the decision, the answer is no. Security dislikes improv.
 */
