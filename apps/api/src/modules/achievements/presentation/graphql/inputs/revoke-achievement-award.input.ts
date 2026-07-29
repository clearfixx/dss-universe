/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/inputs/revoke-achievement-award.input.ts
 *
 * 🎯 Purpose:
 * Defines explicit award revocation with a mandatory reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class RevokeAchievementAwardInput {
  @Field(() => ID)
  @IsString()
  awardId!: string;

  @Field()
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/**
 * Revocation is a new record, never an eraser.
 */
