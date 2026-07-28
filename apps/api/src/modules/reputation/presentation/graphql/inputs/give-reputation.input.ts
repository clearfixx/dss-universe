/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/presentation/graphql/inputs/give-reputation.input.ts
 *
 * 🎯 Purpose:
 * Validates a direct positive or negative reputation decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

@InputType()
export class GiveReputationInput {
  @Field(() => ID)
  @IsUUID()
  recipientId!: string;

  @Field(() => Int)
  @IsIn([-1, 1])
  value!: -1 | 1;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

/**
 * A plus or minus without context is not reputation; it is merely punctuation.
 */
