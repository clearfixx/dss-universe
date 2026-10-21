/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/inputs/manual-achievement-award.input.ts
 *
 * 🎯 Purpose:
 * Defines an explained manual achievement award.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class ManualAchievementAwardInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => ID)
  @IsString()
  achievementId!: string;

  @Field()
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/**
 * Manual does not mean unexplained.
 */
