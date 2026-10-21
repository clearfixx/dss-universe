/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/presentation/graphql/models/levels.model.ts
 *
 * 🎯 Purpose:
 * Exposes level definitions, progress and transition history through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export enum LevelTransitionDirectionModel {
  UP = 'UP',
  DOWN = 'DOWN',
}

registerEnumType(LevelTransitionDirectionModel, {
  name: 'LevelTransitionDirection',
});

@ObjectType('LevelDefinition')
export class LevelDefinitionModel {
  @Field(() => Int)
  level!: number;

  @Field(() => Int)
  threshold!: number;

  @Field(() => ID, { nullable: true })
  updatedById!: string | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType('LevelProgress')
export class LevelProgressModel {
  @Field(() => ID)
  userId!: string;

  @Field(() => Int)
  balance!: number;

  @Field(() => Int)
  currentLevel!: number;

  @Field(() => Int)
  currentThreshold!: number;

  @Field(() => Int, { nullable: true })
  nextLevel!: number | null;

  @Field(() => Int, { nullable: true })
  nextThreshold!: number | null;

  @Field(() => Int)
  pointsIntoLevel!: number;

  @Field(() => Int)
  pointsNeeded!: number;

  @Field(() => Float)
  progressPercent!: number;
}

@ObjectType('LevelTransition')
export class LevelTransitionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => Int)
  fromLevel!: number;

  @Field(() => Int)
  toLevel!: number;

  @Field(() => LevelTransitionDirectionModel)
  direction!: LevelTransitionDirectionModel;

  @Field(() => Int)
  balance!: number;

  @Field()
  sourceEventName!: string;

  @Field(() => GraphQLISODateTime)
  occurredAt!: Date;
}

@ObjectType('LevelTransitionHistory')
export class LevelTransitionHistoryModel {
  @Field(() => [LevelTransitionModel])
  items!: LevelTransitionModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

/**
 * Progress bars are projections. The points ledger still owns the fuel gauge.
 */
