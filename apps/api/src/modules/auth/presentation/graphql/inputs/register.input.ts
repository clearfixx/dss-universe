/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/register.input.ts
 *
 * 🎯 Purpose:
 * Defines validated GraphQL registration input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  username!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;
}
