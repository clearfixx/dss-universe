/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/verify-email.input.ts
 * 🎯 Purpose: Defines the existing email verification token input.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches } from 'class-validator';

@InputType()
export class VerifyEmailInput {
  @Field() @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
}
