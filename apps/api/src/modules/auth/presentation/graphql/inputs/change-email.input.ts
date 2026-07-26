/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/change-email.input.ts
 *
 * 🎯 Purpose:
 * Defines the credential-confirmed email change request.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

@InputType()
export class ChangeEmailInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  currentPassword!: string;
}

/**
 * 📬 A new address is useful only after the owner proves they hold the key.
 */
