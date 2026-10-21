/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/login.input.ts
 *
 * 🎯 Purpose:
 * Defines validated GraphQL login input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{6}-[a-f0-9]{6})$/i)
  twoFactorCode?: string;
}
