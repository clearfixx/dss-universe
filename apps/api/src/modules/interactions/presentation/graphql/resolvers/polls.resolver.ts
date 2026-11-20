/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/polls.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for reading shared polls and casting one-time ballots.
 *
 * ⚠️ Important:
 * Poll creation belongs to owner modules through POLL_COMMANDS, not GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';

import { PollsService } from '../../../application/services/polls.service';
import type { InteractionViewer } from '../../../domain/types/interaction-viewer.type';
import {
  POLL_VISIBILITIES,
  type PollResult,
  type PollVisibility,
} from '../../../domain/types/poll.type';

const PollVisibilityEnum = Object.fromEntries(
  POLL_VISIBILITIES.map((value) => [value, value]),
) as Record<PollVisibility, PollVisibility>;
registerEnumType(PollVisibilityEnum, { name: 'PollVisibility' });

@InputType()
class CastPollBallotInput {
  @Field(() => ID) @IsString() pollId!: string;
  @Field(() => [ID])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  optionIds!: string[];
}

@ObjectType('PollOption')
class PollOptionModel {
  @Field(() => ID) id!: string;
  @Field(() => Int) position!: number;
  @Field() label!: string;
  @Field(() => Int) voteCount!: number;
}

@ObjectType('Poll')
class PollModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) interactionTargetId!: string;
  @Field() question!: string;
  @Field(() => PollVisibilityEnum) visibility!: PollVisibility;
  @Field(() => Int) maxChoices!: number;
  @Field(() => Int) totalBallots!: number;
  @Field(() => [PollOptionModel]) options!: PollOptionModel[];
  @Field() viewerHasVoted!: boolean;
  @Field(() => [ID]) viewerChoiceIds!: string[];
  @Field() createdAt!: Date;
}

@ObjectType('PollVoterPage')
class PollVoterPageModel {
  @Field(() => [ID]) voterIds!: string[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class PollsResolver {
  constructor(private readonly polls: PollsService) {}

  @Query(() => PollModel, { nullable: true })
  @UseGuards(OptionalViewerJwtGuard)
  async pollForTarget(
    @Context() ctx: RequestContext,
    @Args('interactionTargetId', { type: () => ID })
    interactionTargetId: string,
  ): Promise<PollModel | null> {
    const poll = await this.polls.forTarget(
      this.viewer(ctx),
      interactionTargetId,
    );
    return poll ? this.toModel(poll) : null;
  }

  @Query(() => PollVoterPageModel)
  @UseGuards(OptionalViewerJwtGuard)
  pollOptionVoters(
    @Context() ctx: RequestContext,
    @Args('pollId', { type: () => ID }) pollId: string,
    @Args('optionId', { type: () => ID }) optionId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ) {
    return this.polls.voters(this.viewer(ctx), pollId, optionId, page, limit);
  }

  @Mutation(() => PollModel)
  @UseGuards(JwtAuthGuard)
  async castPollBallot(
    @AuthUser() voter: AuthenticatedUser,
    @Args('input') input: CastPollBallotInput,
  ): Promise<PollModel> {
    return this.toModel(
      await this.polls.castBallot(voter.id, input.pollId, input.optionIds),
    );
  }

  private viewer(ctx: RequestContext): InteractionViewer {
    const subjectId = ctx.req.user?.id;
    return subjectId ? { kind: 'AUTHENTICATED', subjectId } : { kind: 'GUEST' };
  }

  private toModel(poll: PollResult): PollModel {
    return {
      id: poll.id,
      interactionTargetId: poll.interactionTargetId,
      question: poll.question,
      visibility: poll.visibility,
      maxChoices: poll.maxChoices,
      totalBallots: poll.totalBallots,
      options: poll.options,
      viewerHasVoted: (poll.viewerChoiceIds?.length ?? 0) > 0,
      viewerChoiceIds: poll.viewerChoiceIds ?? [],
      createdAt: poll.createdAt,
    };
  }
}
