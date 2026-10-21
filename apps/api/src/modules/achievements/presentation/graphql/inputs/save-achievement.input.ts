/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/presentation/graphql/inputs/save-achievement.input.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL contract for creating or updating a definition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType()
export class SaveAchievementInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @Matches(/^[a-z0-9]+([._-][a-z0-9]+)*$/)
  @MaxLength(80)
  key!: string;

  @Field()
  @IsString()
  @Length(2, 80)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field()
  @IsHexColor()
  color!: string;

  @Field()
  @IsString()
  @Length(1, 64)
  badge!: string;

  @Field({ defaultValue: true })
  @IsBoolean()
  isActive!: boolean;
}

/**
 * A definition describes recognition, not access.
 */
