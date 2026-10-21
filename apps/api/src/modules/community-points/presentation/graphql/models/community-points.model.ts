/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/presentation/graphql/models/community-points.model.ts
 *
 * 🎯 Purpose:
 * Exposes explainable Community Points history and configurable rules.
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

@ObjectType('CommunityPointReversal')
export class CommunityPointReversalModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  actorId!: string | null;

  @Field()
  reason!: string;

  @Field(() => GraphQLISODateTime)
  occurredAt!: Date;
}

@ObjectType('CommunityPointEntry')
export class CommunityPointEntryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field()
  ruleKey!: string;

  @Field(() => Int)
  points!: number;

  @Field()
  reason!: string;

  @Field(() => String, { nullable: true })
  sourceEventName!: string | null;

  @Field(() => String, { nullable: true })
  sourceType!: string | null;

  @Field(() => ID, { nullable: true })
  sourceId!: string | null;

  @Field(() => ID, { nullable: true })
  actorId!: string | null;

  @Field(() => GraphQLISODateTime)
  occurredAt!: Date;

  @Field(() => CommunityPointReversalModel, { nullable: true })
  reversal!: CommunityPointReversalModel | null;
}

@ObjectType('CommunityPointHistory')
export class CommunityPointHistoryModel {
  @Field(() => [CommunityPointEntryModel])
  items!: CommunityPointEntryModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int)
  balance!: number;
}

@ObjectType('CommunityPointRule')
export class CommunityPointRuleModel {
  @Field()
  key!: string;

  @Field()
  eventName!: string;

  @Field(() => Int, { nullable: true })
  payloadValue!: number | null;

  @Field(() => Int)
  points!: number;

  @Field(() => Int, { nullable: true })
  dailyLimit!: number | null;

  @Field()
  enabled!: boolean;

  @Field(() => ID, { nullable: true })
  updatedById!: string | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

/**
 * A visible balance is useful; an explainable balance earns trust.
 */
