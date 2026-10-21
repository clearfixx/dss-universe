/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/types/moderation.type.ts
 *
 * 🎯 Purpose:
 * Defines shared content-report and public moderation-annotation contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ContentReportCategory =
  | 'SPAM'
  | 'HARASSMENT'
  | 'MISINFORMATION'
  | 'ILLEGAL'
  | 'OTHER';
export type ContentReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type ModerationAnnotationKind =
  | 'WARNING'
  | 'READ_ONLY'
  | 'BAN'
  | 'REMOVAL';

export type ContentReport = {
  id: string;
  interactionTargetId: string;
  commentId: string | null;
  reporterId: string;
  category: ContentReportCategory;
  reason: string;
  status: ContentReportStatus;
  reviewedById: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ModerationAnnotation = {
  id: string;
  interactionTargetId: string;
  commentId: string | null;
  kind: ModerationAnnotationKind;
  actorId: string;
  reason: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedById: string | null;
  revokeReason: string | null;
  createdAt: Date;
};

/**
 * Reports ask staff to investigate. Annotations tell the public what staff did.
 */
