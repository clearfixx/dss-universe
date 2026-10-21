-- ============================================================================
-- 🚀 DSS Universe
-- Phase 9 — Reports & Moderation Annotations Foundation
-- ============================================================================

CREATE TYPE "ContentReportCategory" AS ENUM (
  'SPAM', 'HARASSMENT', 'MISINFORMATION', 'ILLEGAL', 'OTHER'
);

CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TYPE "ModerationAnnotationKind" AS ENUM (
  'WARNING', 'READ_ONLY', 'BAN', 'REMOVAL'
);

CREATE TABLE "content_reports" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "commentId" TEXT,
  "reporterId" TEXT NOT NULL,
  "category" "ContentReportCategory" NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_reports_review_state_check" CHECK (
    ("status" = 'OPEN' AND "reviewedById" IS NULL AND "reviewNote" IS NULL AND "reviewedAt" IS NULL)
    OR
    ("status" <> 'OPEN' AND "reviewedById" IS NOT NULL AND "reviewNote" IS NOT NULL AND "reviewedAt" IS NOT NULL)
  )
);

CREATE TABLE "moderation_annotations" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "commentId" TEXT,
  "kind" "ModerationAnnotationKind" NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_annotations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moderation_annotations_revocation_state_check" CHECK (
    ("revokedAt" IS NULL AND "revokedById" IS NULL AND "revokeReason" IS NULL)
    OR
    ("revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL AND "revokeReason" IS NOT NULL)
  )
);

CREATE INDEX "content_reports_status_createdAt_id_idx"
  ON "content_reports"("status", "createdAt", "id");
CREATE INDEX "content_reports_interactionTargetId_createdAt_idx"
  ON "content_reports"("interactionTargetId", "createdAt");
CREATE INDEX "content_reports_commentId_createdAt_idx"
  ON "content_reports"("commentId", "createdAt");
CREATE INDEX "content_reports_reporterId_createdAt_idx"
  ON "content_reports"("reporterId", "createdAt");
CREATE UNIQUE INDEX "content_reports_open_target_reporter_key"
  ON "content_reports"("interactionTargetId", "reporterId")
  WHERE "commentId" IS NULL AND "status" = 'OPEN';
CREATE UNIQUE INDEX "content_reports_open_comment_reporter_key"
  ON "content_reports"("commentId", "reporterId")
  WHERE "commentId" IS NOT NULL AND "status" = 'OPEN';

CREATE INDEX "moderation_annotations_interactionTargetId_createdAt_id_idx"
  ON "moderation_annotations"("interactionTargetId", "createdAt", "id");
CREATE INDEX "moderation_annotations_commentId_createdAt_id_idx"
  ON "moderation_annotations"("commentId", "createdAt", "id");
CREATE INDEX "moderation_annotations_revokedAt_expiresAt_idx"
  ON "moderation_annotations"("revokedAt", "expiresAt");

ALTER TABLE "content_reports"
  ADD CONSTRAINT "content_reports_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "content_reports_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "content_reports_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "content_reports_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "moderation_annotations"
  ADD CONSTRAINT "moderation_annotations_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "moderation_annotations_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "moderation_annotations_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "moderation_annotations_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A revoked annotation is history, not an invitation to rewrite history.
