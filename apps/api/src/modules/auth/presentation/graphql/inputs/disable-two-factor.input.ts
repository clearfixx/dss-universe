/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/disable-two-factor.input.ts
 * 🎯 Purpose: Defines the existing two-factor disable input.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches, MinLength } from 'class-validator';

@InputType()
export class DisableTwoFactorInput {
  @Field() @IsString() @MinLength(8) password!: string;
  @Field()
  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{6}-[a-f0-9]{6})$/i)
  code!: string;
}
