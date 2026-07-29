/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/inputs/update-custom-title-settings.input.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL contract for title-selection cooldown policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class UpdateCustomTitleSettingsInput {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(3650)
  selectionCooldownDays!: number;
}

/**
 * Zero days is valid policy, not a missing configuration.
 */
