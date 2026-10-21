/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/presentation/graphql/models/reputation.model.ts
 *
 * 🎯 Purpose:
 * Exposes explainable direct reputation history and policy through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType('ReputationActor')
export class ReputationActorModel {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;
}

@ObjectType('ReputationReversal')
export class ReputationReversalModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ReputationActorModel)
  actor!: ReputationActorModel;

  @Field()
  reason!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

@ObjectType('ReputationEntry')
export class ReputationEntryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ReputationActorModel)
  actor!: ReputationActorModel;

  @Field(() => ID)
  recipientId!: string;

  @Field(() => Int)
  value!: number;

  @Field()
  reason!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => ReputationReversalModel, { nullable: true })
  reversal!: ReputationReversalModel | null;
}

@ObjectType('ReputationHistory')
export class ReputationHistoryModel {
  @Field(() => [ReputationEntryModel])
  items!: ReputationEntryModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int)
  score!: number;
}

@ObjectType('ReputationPolicy')
export class ReputationPolicyModel {
  @Field(() => Int)
  minimumAccountAgeDays!: number;

  @Field(() => ID, { nullable: true })
  updatedById!: string | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

/**
 * Public history answers who, why, when and what changed — no mystery score.
 */
