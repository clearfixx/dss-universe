/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/inputs/revoke-custom-title.input.ts
 *
 * 🎯 Purpose:
 * Defines the administrative contract for revoking a title grant.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class RevokeCustomTitleInput {
  @Field(() => ID)
  @IsString()
  grantId!: string;

  @Field()
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/**
 * Revocation hides the badge while preserving the story.
 */
