/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/presentation/graphql/models/leaderboards.model.ts
 *
 * 🎯 Purpose:
 * Defines explainable GraphQL leaderboard cards and page metadata.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { LeaderboardPeriodInput } from '../inputs/leaderboard.input';

@ObjectType('LeaderboardSelectedTitle')
export class LeaderboardSelectedTitleModel {
  @Field()
  name!: string;

  @Field()
  color!: string;

  @Field()
  badge!: string;
}

@ObjectType('LeaderboardEntry')
export class LeaderboardEntryModel {
  @Field(() => Int)
  rank!: number;

  @Field(() => ID)
  userId!: string;

  @Field()
  username!: string;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => Int)
  communityPoints!: number;

  @Field(() => Int)
  currentLevel!: number;

  @Field(() => Int)
  reputation!: number;

  @Field(() => LeaderboardSelectedTitleModel, { nullable: true })
  selectedTitle!: LeaderboardSelectedTitleModel | null;
}

@ObjectType('LeaderboardPage')
export class LeaderboardPageModel {
  @Field(() => LeaderboardPeriodInput)
  period!: LeaderboardPeriodInput;

  @Field(() => String, { nullable: true })
  startsAt!: string | null;

  @Field()
  endsAt!: string;

  @Field()
  generatedAt!: string;

  @Field(() => [LeaderboardEntryModel])
  items!: LeaderboardEntryModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int, { nullable: true })
  viewerRank!: number | null;

  @Field(() => Int, { nullable: true })
  viewerCommunityPoints!: number | null;
}

/**
 * Every number on the card has a ledger behind it.
 */
