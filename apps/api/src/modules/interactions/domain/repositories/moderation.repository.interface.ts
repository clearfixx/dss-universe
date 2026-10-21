/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/repositories/moderation.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for reports and moderation annotations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

import type {
  ContentReport,
  ContentReportCategory,
  ContentReportStatus,
  ModerationAnnotation,
  ModerationAnnotationKind,
} from '../types/moderation.type';

export const MODERATION_REPOSITORY = Symbol('MODERATION_REPOSITORY');

export interface ModerationRepository {
  createReport(input: {
    interactionTargetId: string;
    commentId: string | null;
    reporterId: string;
    category: ContentReportCategory;
    reason: string;
  }): Promise<ContentReport>;
  findOpenReport(
    interactionTargetId: string,
    commentId: string | null,
    reporterId: string,
  ): Promise<ContentReport | null>;
  listReports(
    status: ContentReportStatus | null,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ContentReport>>;
  reviewReport(
    reportId: string,
    reviewerId: string,
    status: Exclude<ContentReportStatus, 'OPEN'>,
    note: string,
  ): Promise<ContentReport | null>;
  createAnnotation(input: {
    interactionTargetId: string;
    commentId: string | null;
    kind: ModerationAnnotationKind;
    actorId: string;
    reason: string;
    expiresAt: Date | null;
  }): Promise<ModerationAnnotation>;
  listAnnotations(
    interactionTargetId: string,
    commentId: string | null,
  ): Promise<ModerationAnnotation[]>;
  revokeAnnotation(
    annotationId: string,
    actorId: string,
    reason: string,
  ): Promise<ModerationAnnotation | null>;
}

/**
 * Evidence is append-oriented; “undo” means another recorded transition.
 */
