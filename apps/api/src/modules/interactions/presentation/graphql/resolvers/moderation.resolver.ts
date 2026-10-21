/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/moderation.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes user reporting, staff review and public annotation history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { ModerationService } from '../../../application/services/moderation.service';
import type {
  ContentReport,
  ModerationAnnotation,
} from '../../../domain/types/moderation.type';
import {
  ContentReportStatusInput,
  CreateModerationAnnotationInput,
  ModerationPageInput,
  ReportContentInput,
  ReviewContentReportInput,
} from '../inputs/moderation.input';
import {
  ContentReportModel,
  ContentReportPageModel,
  ModerationAnnotationModel,
} from '../models/moderation.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ModerationResolver {
  constructor(private readonly moderation: ModerationService) {}

  @Mutation(() => ContentReportModel)
  reportContent(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ReportContentInput,
  ) {
    return this.moderation
      .report(
        actor.id,
        input.interactionTargetId,
        input.commentId ?? null,
        input.category,
        input.reason,
      )
      .then((report) => this.reportModel(report));
  }

  @Query(() => ContentReportPageModel)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ContentReportsReview)
  async contentReports(
    @Args('status', { type: () => ContentReportStatusInput, nullable: true })
    status?: ContentReportStatusInput,
    @Args('pagination', { nullable: true }) pagination?: ModerationPageInput,
  ) {
    const result = await this.moderation.listReports(
      status ?? null,
      pagination?.page,
      pagination?.limit,
    );
    return {
      ...result,
      items: result.items.map((report) => this.reportModel(report)),
    };
  }

  @Mutation(() => ContentReportModel)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ContentReportsReview)
  reviewContentReport(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ReviewContentReportInput,
  ) {
    return this.moderation
      .reviewReport(input.reportId, actor.id, input.decision, input.note)
      .then((report) => this.reportModel(report));
  }

  @Mutation(() => ModerationAnnotationModel)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ModerationAnnotationsManage)
  createModerationAnnotation(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateModerationAnnotationInput,
  ) {
    return this.moderation
      .annotate(
        actor.id,
        input.interactionTargetId,
        input.commentId ?? null,
        input.kind,
        input.reason,
        input.expiresAt ? new Date(input.expiresAt) : null,
      )
      .then((annotation) => this.annotationModel(annotation));
  }

  @Query(() => [ModerationAnnotationModel])
  async moderationAnnotations(
    @AuthUser() actor: AuthenticatedUser,
    @Args('interactionTargetId', { type: () => ID }) targetId: string,
    @Args('commentId', { type: () => ID, nullable: true }) commentId?: string,
  ) {
    return (
      await this.moderation.annotations(actor.id, targetId, commentId ?? null)
    ).map((annotation) => this.annotationModel(annotation));
  }

  @Mutation(() => ModerationAnnotationModel)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ModerationAnnotationsManage)
  revokeModerationAnnotation(
    @AuthUser() actor: AuthenticatedUser,
    @Args('annotationId', { type: () => ID }) annotationId: string,
    @Args('reason') reason: string,
  ) {
    return this.moderation
      .revokeAnnotation(annotationId, actor.id, reason)
      .then((annotation) => this.annotationModel(annotation));
  }

  private reportModel(report: ContentReport): ContentReportModel {
    return {
      ...report,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    } as ContentReportModel;
  }

  private annotationModel(
    annotation: ModerationAnnotation,
  ): ModerationAnnotationModel {
    return {
      ...annotation,
      expiresAt: annotation.expiresAt?.toISOString() ?? null,
      revokedAt: annotation.revokedAt?.toISOString() ?? null,
      createdAt: annotation.createdAt.toISOString(),
    } as ModerationAnnotationModel;
  }
}

/**
 * Permissions guard the console; authenticated users retain the right to report.
 */
