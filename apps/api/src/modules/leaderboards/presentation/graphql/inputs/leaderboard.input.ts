/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/presentation/graphql/inputs/leaderboard.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded period and pagination input for leaderboard queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

import type { LeaderboardPeriod } from '../../../domain/types/leaderboards.type';

export enum LeaderboardPeriodInput {
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  ALL_TIME = 'ALL_TIME',
}

registerEnumType(LeaderboardPeriodInput, {
  name: 'LeaderboardPeriod',
});

@InputType()
export class LeaderboardInput {
  @Field(() => LeaderboardPeriodInput, {
    defaultValue: LeaderboardPeriodInput.ALL_TIME,
  })
  @IsEnum(LeaderboardPeriodInput)
  period: LeaderboardPeriod = LeaderboardPeriodInput.ALL_TIME;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page = 1;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

/**
 * Small pages keep the podium fast even when the Universe gets crowded.
 */
