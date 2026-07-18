/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/inputs/users-page.input.ts
 *
 * 🎯 Purpose:
 * Defines validated and bounded GraphQL pagination input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@InputType()
export class UsersPageInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  page = 1;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
