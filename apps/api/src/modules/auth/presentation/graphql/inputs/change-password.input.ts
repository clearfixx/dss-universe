/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/change-password.input.ts
 *
 * 🎯 Purpose:
 * Defines the current/new password rotation request.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @Field()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

/**
 * 🔑 Rotate credentials before they start believing they are immortal.
 */
