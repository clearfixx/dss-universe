/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/inputs/comment.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded GraphQL inputs for comment creation, editing and pagination.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateCommentInput {
  @Field(() => ID)
  @IsUUID()
  interactionTargetId!: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

@InputType()
export class EditCommentInput {
  @Field(() => ID)
  @IsUUID()
  commentId!: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

@InputType()
export class CommentsPageInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

/**
 * Validation is the bouncer; application policy still owns the guest list.
 */
