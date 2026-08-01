/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/moderation.service.ts
 *
 * 🎯 Purpose:
 * Coordinates target-aware reporting and public moderation annotations.
 *
 * 🧠 Responsibilities:
 * • validates report and annotation subjects;
 * • prevents duplicate open reports by the same user;
 * • keeps sanction policy outside the Interaction Platform;
 * • exposes public annotation history without deleting revoked evidence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  COMMENTS_REPOSITORY,
  type CommentsRepository,
} from '../../domain/repositories/comments.repository.interface';
import {
  MODERATION_REPOSITORY,
  type ModerationRepository,
} from '../../domain/repositories/moderation.repository.interface';
import type {
  ContentReportCategory,
  ContentReportStatus,
  ModerationAnnotationKind,
} from '../../domain/types/moderation.type';
import { InteractionTargetsService } from './interaction-targets.service';

@Injectable()
export class ModerationService {
  constructor(
    @Inject(MODERATION_REPOSITORY)
    private readonly moderation: ModerationRepository,
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
    private readonly targets: InteractionTargetsService,
  ) {}

  async report(
    actorId: string,
    targetId: string,
    commentId: string | null,
    category: ContentReportCategory,
    reason: string,
  ) {
    await this.assertReadable(targetId, actorId);
    await this.assertCommentSubject(targetId, commentId);
    const existing = await this.moderation.findOpenReport(
      targetId,
      commentId,
      actorId,
    );
    if (existing)
      throw new ConflictException('This content is already reported.');
    return this.moderation.createReport({
      interactionTargetId: targetId,
      commentId,
      reporterId: actorId,
      category,
      reason: this.cleanReason(reason),
    });
  }

  listReports(status: ContentReportStatus | null, page = 1, limit = 20) {
    return this.moderation.listReports(status, page, limit);
  }

  async reviewReport(
    reportId: string,
    reviewerId: string,
    status: Exclude<ContentReportStatus, 'OPEN'>,
    note: string,
  ) {
    const report = await this.moderation.reviewReport(
      reportId,
      reviewerId,
      status,
      this.cleanReason(note),
    );
    if (!report) throw new NotFoundException('Content report was not found.');
    return report;
  }

  async annotate(
    actorId: string,
    targetId: string,
    commentId: string | null,
    kind: ModerationAnnotationKind,
    reason: string,
    expiresAt: Date | null,
  ) {
    await this.targets.getById(targetId);
    await this.assertCommentSubject(targetId, commentId);
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException(
        'Annotation expiration must be in the future.',
      );
    }
    return this.moderation.createAnnotation({
      interactionTargetId: targetId,
      commentId,
      kind,
      actorId,
      reason: this.cleanReason(reason),
      expiresAt,
    });
  }

  async annotations(
    actorId: string,
    targetId: string,
    commentId: string | null,
  ) {
    await this.assertReadable(targetId, actorId);
    await this.assertCommentSubject(targetId, commentId);
    return this.moderation.listAnnotations(targetId, commentId);
  }

  async revokeAnnotation(
    annotationId: string,
    actorId: string,
    reason: string,
  ) {
    const annotation = await this.moderation.revokeAnnotation(
      annotationId,
      actorId,
      this.cleanReason(reason),
    );
    if (!annotation) {
      throw new NotFoundException(
        'Active moderation annotation was not found.',
      );
    }
    return annotation;
  }

  private async assertReadable(targetId: string, actorId: string) {
    const decision = await this.targets.authorize(targetId, actorId, 'READ');
    if (!decision.allowed) {
      throw new ForbiddenException('Interaction target denied read access.');
    }
  }

  private async assertCommentSubject(
    targetId: string,
    commentId: string | null,
  ) {
    if (!commentId) return;
    const comment = await this.comments.findById(commentId);
    if (!comment || comment.interactionTargetId !== targetId) {
      throw new BadRequestException(
        'Comment does not belong to the interaction target.',
      );
    }
  }

  private cleanReason(value: string): string {
    const reason = value.trim();
    if (reason.length < 3 || reason.length > 1000) {
      throw new BadRequestException(
        'Reason must contain 3 to 1000 characters.',
      );
    }
    return reason;
  }
}

/**
 * A report is a request for judgment, never a verdict produced by a button.
 */
