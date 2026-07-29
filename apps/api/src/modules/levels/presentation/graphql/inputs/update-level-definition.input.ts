/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/presentation/graphql/inputs/update-level-definition.input.ts
 *
 * 🎯 Purpose:
 * Defines a permission-backed level threshold update.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class UpdateLevelDefinitionInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(1000)
  level!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  threshold!: number;
}

/**
 * Thresholds move policy forward; historical transitions stay where they are.
 */
