/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/presentation/graphql/inputs/update-reputation-policy.input.ts
 *
 * 🎯 Purpose:
 * Validates Mission Control updates to reputation eligibility policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class UpdateReputationPolicyInput {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(3650)
  minimumAccountAgeDays!: number;
}

/**
 * Policy is configurable; yesterday's ledger is not.
 */
