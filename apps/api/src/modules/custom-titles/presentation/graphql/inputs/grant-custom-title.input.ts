/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/inputs/grant-custom-title.input.ts
 *
 * 🎯 Purpose:
 * Defines the administrative contract for awarding a title.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class GrantCustomTitleInput {
  @Field(() => ID)
  @IsString()
  userId!: string;

  @Field(() => ID)
  @IsString()
  titleId!: string;

  @Field()
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/**
 * Every award carries a reason, not only a shiny label.
 */
