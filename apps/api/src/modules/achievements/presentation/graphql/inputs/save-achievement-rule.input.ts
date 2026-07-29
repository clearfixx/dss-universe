/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/inputs/save-achievement-rule.input.ts
 *
 * 🎯 Purpose:
 * Defines event matching, repeatability, cooldown, and daily-cap policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class SaveAchievementRuleInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field(() => ID)
  @IsString()
  achievementId!: string;

  @Field()
  @Matches(/^[a-z0-9]+([.-][a-z0-9]+)*\.v[1-9][0-9]*$/)
  eventName!: string;

  @Field({ defaultValue: 'userId' })
  @Matches(/^[A-Za-z][A-Za-z0-9_]{0,63}$/)
  recipientPayloadKey!: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  repeatable!: boolean;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @Max(87600)
  cooldownHours!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  dailyCap?: number;

  @Field({ defaultValue: true })
  @IsBoolean()
  enabled!: boolean;
}

/**
 * Rules listen to events; they never query foreign module tables.
 */
