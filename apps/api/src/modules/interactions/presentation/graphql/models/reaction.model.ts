/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/reaction.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL projections for reactions and vote aggregates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { ReactionKindModel } from '../inputs/reaction.input';

@ObjectType('Reaction')
export class ReactionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  interactionTargetId!: string;

  @Field(() => ID)
  actorId!: string;

  @Field(() => ReactionKindModel)
  kind!: ReactionKindModel;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('ReactionSummary')
export class ReactionSummaryModel {
  @Field(() => ID)
  interactionTargetId!: string;

  @Field(() => Int)
  likes!: number;

  @Field(() => Int)
  upvotes!: number;

  @Field(() => Int)
  downvotes!: number;

  @Field(() => Int)
  score!: number;

  @Field(() => Int)
  total!: number;

  @Field(() => ReactionKindModel, { nullable: true })
  viewerReaction!: ReactionKindModel | null;

  @Field(() => String, { nullable: true })
  updatedAt!: string | null;
}

@ObjectType('SetReactionPayload')
export class SetReactionPayloadModel {
  @Field(() => ReactionModel)
  reaction!: ReactionModel;

  @Field(() => ReactionSummaryModel)
  summary!: ReactionSummaryModel;

  @Field()
  changed!: boolean;
}

/**
 * Score is arithmetic; trust is Reputation. Similar numbers, different stories.
 */
