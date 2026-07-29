/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/inputs/rollback-achievement-source.input.ts
 *
 * 🎯 Purpose:
 * Defines moderation rollback for awards tied to a source object.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsString, Length, MaxLength } from 'class-validator';

@InputType()
export class RollbackAchievementSourceInput {
  @Field()
  @IsString()
  @MaxLength(100)
  sourceType!: string;

  @Field()
  @IsString()
  @MaxLength(200)
  sourceId!: string;

  @Field()
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/**
 * Moderation rolls back evidence by source, not by guesswork.
 */
