/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/inputs/comment-draft.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded GraphQL inputs for comment draft autosave and restoration.
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
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class SaveCommentDraftInput {
  @Field(() => ID)
  @IsUUID()
  interactionTargetId!: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @Field()
  @IsString()
  @MaxLength(1_000_000)
  documentJson!: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  baseVersion!: number;
}

/** The client supplies its version; the server decides whether it is current. */
