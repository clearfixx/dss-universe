/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/presentation/graphql/inputs/update-community-point-rule.input.ts
 *
 * 🎯 Purpose:
 * Defines configurable Community Points weights and daily anti-abuse limits.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class UpdateCommunityPointRuleInput {
  @Field()
  @IsString()
  key!: string;

  @Field(() => Int)
  @IsInt()
  @Min(-10_000)
  @Max(10_000)
  points!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  dailyLimit!: number | null;

  @Field()
  @IsBoolean()
  enabled!: boolean;
}

/**
 * Weights are policy. Ledger entries remain historical facts.
 */
