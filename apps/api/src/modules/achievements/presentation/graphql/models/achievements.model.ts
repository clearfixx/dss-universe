/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/models/achievements.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL representations for definitions, rules, and award history.
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
  registerEnumType,
} from '@nestjs/graphql';

export enum AchievementAwardKindModel {
  RULE = 'RULE',
  MANUAL = 'MANUAL',
}

registerEnumType(AchievementAwardKindModel, {
  name: 'AchievementAwardKind',
});

@ObjectType('Achievement')
export class AchievementModel {
  @Field(() => ID)
  id!: string;

  @Field()
  key!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field()
  color!: string;

  @Field()
  badge!: string;

  @Field()
  isActive!: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType('AchievementRule')
export class AchievementRuleModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  achievementId!: string;

  @Field()
  eventName!: string;

  @Field()
  recipientPayloadKey!: string;

  @Field()
  repeatable!: boolean;

  @Field(() => Int)
  cooldownHours!: number;

  @Field(() => Int, { nullable: true })
  dailyCap!: number | null;

  @Field()
  enabled!: boolean;

  @Field(() => AchievementModel)
  achievement!: AchievementModel;
}

@ObjectType('AchievementAwardRevocation')
export class AchievementAwardRevocationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  awardId!: string;

  @Field(() => ID, { nullable: true })
  revokedById!: string | null;

  @Field()
  reason!: string;

  @Field(() => GraphQLISODateTime)
  occurredAt!: Date;
}

@ObjectType('AchievementAward')
export class AchievementAwardModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID)
  achievementId!: string;

  @Field(() => ID, { nullable: true })
  ruleId!: string | null;

  @Field(() => AchievementAwardKindModel)
  kind!: AchievementAwardKindModel;

  @Field()
  reason!: string;

  @Field(() => ID, { nullable: true })
  awardedById!: string | null;

  @Field(() => String, { nullable: true })
  sourceEventName!: string | null;

  @Field(() => String, { nullable: true })
  sourceType!: string | null;

  @Field(() => String, { nullable: true })
  sourceId!: string | null;

  @Field(() => GraphQLISODateTime)
  awardedAt!: Date;

  @Field(() => AchievementModel)
  achievement!: AchievementModel;

  @Field(() => AchievementAwardRevocationModel, { nullable: true })
  revocation!: AchievementAwardRevocationModel | null;
}

/**
 * The API shows both the badge and the evidence that earned it.
 */
