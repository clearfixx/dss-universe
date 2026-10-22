/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/audience-engagement.resolver.ts
 * 🎯 Purpose: Delegates optional-viewer mutations through the existing engagement contracts.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@api/core/auth';
import { AudienceEngagementService } from '../../../application/services/audience-engagement.service';
import {
  SHARE_CHANNELS,
  type AudienceEngagementResult,
} from '../../../domain/types/audience-engagement.type';
import { OptionalEngagementJwtGuard } from '../guards/optional-engagement-jwt.guard';
import {
  RecordViewInput,
  RecordShareInput,
} from '../inputs/audience-engagement.input';
import { AudienceEngagementModel } from '../models/audience-engagement.model';

@Resolver()
@UseGuards(OptionalEngagementJwtGuard)
export class AudienceEngagementResolver {
  constructor(private readonly engagement: AudienceEngagementService) {}

  @Mutation(() => AudienceEngagementModel)
  recordInteractionView(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('input') input: RecordViewInput,
  ): Promise<AudienceEngagementResult> {
    return this.engagement.recordView(
      input.interactionTargetId,
      input.visitorId,
      context.req.user?.id,
    );
  }

  @Mutation(() => AudienceEngagementModel)
  recordInteractionShare(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('input') input: RecordShareInput,
  ): Promise<AudienceEngagementResult> {
    if (!SHARE_CHANNELS.includes(input.channel)) {
      throw new Error('Unsupported share channel.');
    }
    return this.engagement.recordShare(
      input.interactionTargetId,
      input.channel,
      input.visitorId,
      context.req.user?.id,
    );
  }
}
