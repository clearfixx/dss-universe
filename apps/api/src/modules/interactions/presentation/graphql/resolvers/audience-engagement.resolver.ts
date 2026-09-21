import { ExecutionContext, Injectable, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  GqlExecutionContext,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { IsEnum, IsUUID } from 'class-validator';

import type { AuthenticatedUser } from '@api/core/auth';
import { AudienceEngagementService } from '../../../application/services/audience-engagement.service';
import {
  SHARE_CHANNELS,
  type AudienceEngagementResult,
} from '../../../domain/types/audience-engagement.type';

enum ShareChannelModel {
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  THREADS = 'THREADS',
  INSTAGRAM = 'INSTAGRAM',
  PINTEREST = 'PINTEREST',
  COPY_LINK = 'COPY_LINK',
  PRINT = 'PRINT',
}

registerEnumType(ShareChannelModel, { name: 'ShareChannel' });

@Injectable()
class OptionalEngagementJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<{
      req: { user?: AuthenticatedUser };
    }>().req;
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser | undefined {
    return error ? undefined : user;
  }
}

@InputType()
class RecordViewInput {
  @Field(() => ID) @IsUUID() interactionTargetId!: string;
  @Field() @IsUUID() visitorId!: string;
}

@InputType()
class RecordShareInput extends RecordViewInput {
  @Field(() => ShareChannelModel)
  @IsEnum(ShareChannelModel)
  channel!: ShareChannelModel;
}

@ObjectType('ShareChannelCount')
class ShareChannelCountModel {
  @Field(() => ShareChannelModel) channel!: ShareChannelModel;
  @Field(() => Int) count!: number;
}

@ObjectType('AudienceEngagement')
class AudienceEngagementModel {
  @Field() changed!: boolean;
  @Field(() => Int) viewCount!: number;
  @Field(() => Int) shareCount!: number;
  @Field(() => [ShareChannelCountModel]) shares!: ShareChannelCountModel[];
}

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
