/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/inputs/moderation.input.ts
 *
 * 🎯 Purpose:
 * Defines validated GraphQL commands and filters for content moderation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum ContentReportCategoryInput {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  MISINFORMATION = 'MISINFORMATION',
  ILLEGAL = 'ILLEGAL',
  OTHER = 'OTHER',
}
export enum ContentReportStatusInput {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}
export enum ReportReviewDecisionInput {
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}
export enum ModerationAnnotationKindInput {
  WARNING = 'WARNING',
  READ_ONLY = 'READ_ONLY',
  BAN = 'BAN',
  REMOVAL = 'REMOVAL',
}

registerEnumType(ContentReportCategoryInput, { name: 'ContentReportCategory' });
registerEnumType(ContentReportStatusInput, { name: 'ContentReportStatus' });
registerEnumType(ReportReviewDecisionInput, { name: 'ReportReviewDecision' });
registerEnumType(ModerationAnnotationKindInput, {
  name: 'ModerationAnnotationKind',
});

@InputType()
export class ReportContentInput {
  @Field(() => ID)
  @IsUUID()
  interactionTargetId!: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  commentId?: string;

  @Field(() => ContentReportCategoryInput)
  @IsEnum(ContentReportCategoryInput)
  category!: ContentReportCategoryInput;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

@InputType()
export class ReviewContentReportInput {
  @Field(() => ID)
  @IsUUID()
  reportId!: string;

  @Field(() => ReportReviewDecisionInput)
  @IsEnum(ReportReviewDecisionInput)
  decision!: ReportReviewDecisionInput;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note!: string;
}

@InputType()
export class CreateModerationAnnotationInput {
  @Field(() => ID)
  @IsUUID()
  interactionTargetId!: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  commentId?: string;

  @Field(() => ModerationAnnotationKindInput)
  @IsEnum(ModerationAnnotationKindInput)
  kind!: ModerationAnnotationKindInput;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@InputType()
export class ModerationPageInput {
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
 * Free text explains a decision; enums keep the workflow from inventing moods.
 */
