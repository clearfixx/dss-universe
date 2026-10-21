/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/comment-draft.model.ts
 *
 * 🎯 Purpose:
 * Projects private comment drafts into their authenticated GraphQL contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('CommentDraft')
export class CommentDraftModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  interactionTargetId!: string;

  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Field()
  documentJson!: string;

  @Field()
  plainText!: string;

  @Field(() => Int)
  version!: number;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

/** Private draft models deliberately omit author identity: the viewer is the owner. */
