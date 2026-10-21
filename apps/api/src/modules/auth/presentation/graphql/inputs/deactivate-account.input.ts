/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/deactivate-account.input.ts
 *
 * 🎯 Purpose:
 * Confirms the current password before account deactivation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class DeactivateAccountInput {
  @Field()
  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * 🔐 Closing the airlock requires the captain's key.
 */
