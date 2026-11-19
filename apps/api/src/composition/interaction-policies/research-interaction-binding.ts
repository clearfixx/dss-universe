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
} from '@api/modules/interactions';
import {
  RESEARCH_INTERACTION_DECISIONS,
  type ResearchInteractionDecisions,
} from '@api/modules/research-lab';

@Injectable()
export class ResearchInteractionBinding
  implements OnModuleInit, OnModuleDestroy
{
  private readonly policy: RegisteredInteractionPolicy;
  constructor(
    @Inject(INTERACTION_POLICY_REGISTRATIONS)
    private readonly registry: InteractionPolicyRegistrations,
    @Inject(RESEARCH_INTERACTION_DECISIONS)
    decisions: ResearchInteractionDecisions,
  ) {
    this.policy = {
      kind: 'research-lab.page',
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
