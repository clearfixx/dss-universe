/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/request-password-recovery.input.ts
 * 🎯 Purpose: Defines the existing password recovery request input.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, MaxLength } from 'class-validator';

@InputType()
export class RequestPasswordRecoveryInput {
  @Field() @IsEmail() @MaxLength(254) email!: string;
}
