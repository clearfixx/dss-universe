/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Policy Composition
 * 📄 File: apps/api/src/composition/interaction-policies/interaction-owner-bindings.service.ts
 *
 * 🎯 Purpose:
 * Owns root registration lifecycle and minimal owner-request translation for fixed target kinds.
 *
 * 🧠 Responsibilities:
 * • registers fixed News/Wall kinds and cleans up partial initialization;
 * • maps only owner-required inputs and allowlisted verdict fields.
 *
 * 🏗️ Architecture:
 * Root composition lifecycle; owners retain all capability/privacy decisions.
 *
 * ⚠️ Important:
 * Unknown capabilities, absent policies and provider failures must never become an allow.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Inject,
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  INTERACTION_POLICY_REGISTRATIONS,
  type InteractionPolicyRegistrations,
  type RegisteredInteractionPolicy,
  type InteractionPolicyCapability,
  type InteractionPolicyVerdict,
} from '@api/modules/interactions';
import {
  NEWS_INTERACTION_DECISIONS,
  NEWS_INTERACTION_KIND,
  type NewsInteractionDecisions,
  type NewsInteractionCapability,
} from '@api/modules/news';
import {
  PROFILE_WALL_INTERACTION_DECISIONS,
  PROFILE_WALL_INTERACTION_KIND,
  type ProfileWallInteractionDecisions,
} from '@api/modules/users';

const newsCapabilities: Record<
  InteractionPolicyCapability,
  NewsInteractionCapability
> = {
  READ: 'READ',
  COMMENT: 'COMMENT',
  REACT: 'REACT',
  BOOKMARK: 'BOOKMARK',
  SHARE: 'SHARE',
};
@Injectable()
export class InteractionOwnerBindingsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly newsPolicy: RegisteredInteractionPolicy;
  private readonly wallPolicy: RegisteredInteractionPolicy;
  constructor(
    @Inject(INTERACTION_POLICY_REGISTRATIONS)
    private readonly registrations: InteractionPolicyRegistrations,
    @Inject(NEWS_INTERACTION_DECISIONS) news: NewsInteractionDecisions,
    @Inject(PROFILE_WALL_INTERACTION_DECISIONS)
    wall: ProfileWallInteractionDecisions,
  ) {
    this.newsPolicy = Object.freeze({
      kind: NEWS_INTERACTION_KIND,
      authorize: async (request) => {
        if (!Object.hasOwn(newsCapabilities, request.capability))
          throw new Error('Unsupported News interaction capability.');
        const capability = newsCapabilities[request.capability];
        return this.toVerdict(
          await news.authorize({
            articleId: request.ownerId,
            interactionTargetId: request.targetId,
            capability,
          }),
        );
      },
    } satisfies RegisteredInteractionPolicy);
    this.wallPolicy = Object.freeze({
      kind: PROFILE_WALL_INTERACTION_KIND,
      authorize: async (request) =>
        this.toVerdict(
          await wall.authorize({
            postId: request.ownerId,
            interactionTargetId: request.targetId,
            viewerId: request.actorId,
          }),
        ),
    } satisfies RegisteredInteractionPolicy);
  }
  onModuleInit(): void {
    this.registrations.register(this.newsPolicy);
    try {
      this.registrations.register(this.wallPolicy);
    } catch (error) {
      this.registrations.unregister(this.newsPolicy);
      throw error;
    }
  }
  onModuleDestroy(): void {
    this.registrations.unregister(this.wallPolicy);
    this.registrations.unregister(this.newsPolicy);
  }
  private toVerdict(
    decision: InteractionPolicyVerdict,
  ): InteractionPolicyVerdict {
    return decision.reason === undefined
      ? { allowed: decision.allowed }
      : { allowed: decision.allowed, reason: decision.reason };
  }
}
