/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Policy Composition
 * 📄 File: apps/api/src/composition/interaction-policies/forum-interaction-binding.ts
 *
 * 🎯 Purpose:
 * Registers Forum as the owner policy for `forum.topic` Interaction Targets.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  INTERACTION_POLICY_REGISTRATIONS,
  type InteractionPolicyRegistrations,
  type RegisteredInteractionPolicy,
} from '@api/modules/interactions';
import {
  FORUM_INTERACTION_DECISIONS,
  FORUM_TOPIC_INTERACTION_KIND,
  type ForumInteractionDecisions,
} from '@api/modules/forum';

@Injectable()
export class ForumInteractionBinding implements OnModuleInit, OnModuleDestroy {
  private readonly policy: RegisteredInteractionPolicy;
  constructor(
    @Inject(INTERACTION_POLICY_REGISTRATIONS)
    private readonly registry: InteractionPolicyRegistrations,
    @Inject(FORUM_INTERACTION_DECISIONS)
    decisions: ForumInteractionDecisions,
  ) {
    this.policy = {
      kind: FORUM_TOPIC_INTERACTION_KIND,
      authorize: async ({ viewer, ownerId, targetId, capability }) => {
        if (
          viewer?.kind !== 'GUEST' &&
          !(viewer?.kind === 'AUTHENTICATED' && viewer.subjectId?.trim())
        )
          return { allowed: false };
        return {
          allowed: await decisions.permits(
            ownerId,
            targetId,
            viewer.kind === 'GUEST' ? null : viewer.subjectId,
            capability,
          ),
        };
      },
    };
  }
  onModuleInit() {
    this.registry.register(this.policy);
  }
  onModuleDestroy() {
    this.registry.unregister(this.policy);
  }
}
