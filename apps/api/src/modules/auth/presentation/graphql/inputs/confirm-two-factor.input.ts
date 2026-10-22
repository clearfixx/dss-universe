/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/confirm-two-factor.input.ts
 * 🎯 Purpose: Defines the existing two-factor confirmation input.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches } from 'class-validator';

@InputType()
export class ConfirmTwoFactorInput {
  @Field() @IsString() @Matches(/^\d{6}$/) code!: string;
}
