/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/inputs/reaction.input.ts
 *
 * 🎯 Purpose:
 * Defines the bounded GraphQL command for setting a shared reaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';

export enum ReactionKindModel {
  LIKE = 'LIKE',
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

registerEnumType(ReactionKindModel, {
  name: 'ReactionKind',
  description:
    'A content signal that remains separate from user reputation changes.',
});

@InputType()
export class SetReactionInput {
  @Field(() => ID)
  @IsUUID()
  interactionTargetId!: string;

  @Field(() => ReactionKindModel)
  @IsEnum(ReactionKindModel)
  kind!: ReactionKindModel;
}

/**
 * Three explicit choices beat a free-form emoji zoo in a v1 contract.
 */
