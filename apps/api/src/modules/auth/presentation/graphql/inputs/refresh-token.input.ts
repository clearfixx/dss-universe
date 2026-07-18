/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/inputs/refresh-token.input.ts
 *
 * 🎯 Purpose:
 * Defines validated GraphQL refresh-token input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
