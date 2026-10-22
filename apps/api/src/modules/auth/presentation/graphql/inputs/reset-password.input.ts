/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/reset-password.input.ts
 * 🎯 Purpose: Defines the existing credential reset input.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

@InputType()
export class ResetPasswordInput {
  @Field() @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @Field() @IsString() @MinLength(8) @MaxLength(72) password!: string;
}
