/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/presentation/graphql/inputs/reverse-reputation.input.ts
 *
 * 🎯 Purpose:
 * Validates a permission-backed reputation reversal request.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

@InputType()
export class ReverseReputationInput {
  @Field(() => ID)
  @IsUUID()
  entryId!: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

/**
 * Reversal is a correction with a signature, never a silent disappearance.
 */
