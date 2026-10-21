/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/inputs/create-wall-post.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded text and image input for Profile Wall posts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreateWallPostInput {
  @Field(() => ID)
  @IsUUID()
  profileOwnerId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  imageMediaId?: string;
}

/**
 * Keep the DTO boring. The wall service has enough drama with privacy rules.
 */
