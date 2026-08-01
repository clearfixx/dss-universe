/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/moderation.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL projections for reports and public moderation history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import {
  ContentReportCategoryInput,
  ContentReportStatusInput,
  ModerationAnnotationKindInput,
} from '../inputs/moderation.input';

@ObjectType('ContentReport')
export class ContentReportModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) interactionTargetId!: string;
  @Field(() => ID, { nullable: true }) commentId!: string | null;
  @Field(() => ID) reporterId!: string;
  @Field(() => ContentReportCategoryInput)
  category!: ContentReportCategoryInput;
  @Field() reason!: string;
  @Field(() => ContentReportStatusInput) status!: ContentReportStatusInput;
  @Field(() => ID, { nullable: true }) reviewedById!: string | null;
  @Field(() => String, { nullable: true }) reviewNote!: string | null;
  @Field(() => String, { nullable: true }) reviewedAt!: string | null;
  @Field() createdAt!: string;
  @Field() updatedAt!: string;
}

@ObjectType('ContentReportPage')
export class ContentReportPageModel {
  @Field(() => [ContentReportModel]) items!: ContentReportModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
  @Field(() => Int) totalPages!: number;
}

@ObjectType('ModerationAnnotation')
export class ModerationAnnotationModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) interactionTargetId!: string;
  @Field(() => ID, { nullable: true }) commentId!: string | null;
  @Field(() => ModerationAnnotationKindInput)
  kind!: ModerationAnnotationKindInput;
  @Field(() => ID) actorId!: string;
  @Field() reason!: string;
  @Field(() => String, { nullable: true }) expiresAt!: string | null;
  @Field(() => String, { nullable: true }) revokedAt!: string | null;
  @Field(() => ID, { nullable: true }) revokedById!: string | null;
  @Field(() => String, { nullable: true }) revokeReason!: string | null;
  @Field() createdAt!: string;
}

/**
 * Public history may be uncomfortable. Invisible moderation is worse.
 */
