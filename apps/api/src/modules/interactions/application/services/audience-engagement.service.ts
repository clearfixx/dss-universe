import { createHash } from 'node:crypto';

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import {
  AUDIENCE_ENGAGEMENT_REPOSITORY,
  type AudienceEngagementRepository,
} from '../../domain/repositories/audience-engagement.repository.interface';
import type {
  AudienceEngagementResult,
  ShareChannel,
} from '../../domain/types/audience-engagement.type';
import { InteractionTargetsService } from './interaction-targets.service';

@Injectable()
export class AudienceEngagementService {
  constructor(
    @Inject(AUDIENCE_ENGAGEMENT_REPOSITORY)
    private readonly repository: AudienceEngagementRepository,
    private readonly targets: InteractionTargetsService,
  ) {}

  async recordView(
    targetId: string,
    visitorId: string,
    actorId?: string,
  ): Promise<AudienceEngagementResult> {
    await this.authorize(targetId, actorId, 'READ');
    return this.repository.recordView(
      targetId,
      this.viewerKey(visitorId, actorId),
      actorId,
    );
  }

  async recordShare(
    targetId: string,
    channel: ShareChannel,
    visitorId: string,
    actorId?: string,
  ): Promise<AudienceEngagementResult> {
    await this.authorize(targetId, actorId, 'SHARE');
    return this.repository.recordShare(
      targetId,
      channel,
      this.viewerKey(visitorId, actorId),
      actorId,
    );
  }

  private async authorize(
    targetId: string,
    actorId: string | undefined,
    capability: 'READ' | 'SHARE',
  ): Promise<void> {
    const decision = await this.targets.authorize(
      targetId,
      actorId ?? 'anonymous',
      capability,
    );
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Interaction target denied ${capability.toLowerCase()}: ${decision.reason ?? 'POLICY_DENIED'}.`,
      );
    }
  }

  private viewerKey(visitorId: string, actorId?: string): string {
    if (actorId) return `user:${actorId}`;
    return `guest:${createHash('sha256').update(visitorId).digest('hex')}`;
  }
}
