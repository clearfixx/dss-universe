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
import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ReputationSourceTypeEnum } from '../models/reputation.model';

@InputType()
export class ReputationSourceInput {
  @Field(() => ReputationSourceTypeEnum)
  @IsIn(Object.values(ReputationSourceTypeEnum))
  type!: ReputationSourceTypeEnum;

  @Field(() => ID)
  @IsUUID()
  id!: string;
}

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

  @Field(() => ReputationSourceInput, {
    nullable: true,
    description: 'Where the change is made, e.g. a forum post.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReputationSourceInput)
  source?: ReputationSourceInput | null;
}

/**
 * A plus or minus without context is not reputation; it is merely punctuation.
 */
