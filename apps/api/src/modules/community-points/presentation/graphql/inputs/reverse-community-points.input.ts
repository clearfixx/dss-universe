/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/presentation/graphql/inputs/reverse-community-points.input.ts
 *
 * 🎯 Purpose:
 * Defines a permission-backed compensating reversal request.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, Length } from 'class-validator';

@InputType()
export class ReverseCommunityPointsInput {
  @Field(() => ID)
  @IsUUID()
  entryId!: string;

  @Field()
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/**
 * Corrections explain history; they do not rewrite it.
 */
