CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'ARCHIVE', 'OTHER');
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'AUTHENTICATED', 'PRIVATE', 'RESTRICTED');
CREATE TYPE "MediaStorageProvider" AS ENUM ('LOCAL', 'MINIO', 'S3');
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'REJECTED', 'QUARANTINED', 'DELETING', 'DELETED');
CREATE TYPE "MediaUploadStatus" AS ENUM ('INITIATED', 'UPLOADING', 'COMPLETED', 'ABORTED', 'EXPIRED', 'FAILED');

CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "storageProvider" "MediaStorageProvider" NOT NULL DEFAULT 'LOCAL',
    "bucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "altText" TEXT,
    "caption" TEXT,
    "metadata" JSONB,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "readyAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_variants" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageProvider" "MediaStorageProvider" NOT NULL,
    "bucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_references" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    CONSTRAINT "media_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_upload_sessions" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "policyKey" TEXT NOT NULL,
    "status" "MediaUploadStatus" NOT NULL DEFAULT 'INITIATED',
    "storageProvider" "MediaStorageProvider" NOT NULL DEFAULT 'LOCAL',
    "bucket" TEXT NOT NULL,
    "temporaryKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "declaredMimeType" TEXT NOT NULL,
    "declaredSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "media_upload_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_audit_logs" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_storageProvider_bucket_storageKey_key" ON "media"("storageProvider", "bucket", "storageKey");
CREATE INDEX "media_ownerId_idx" ON "media"("ownerId");
CREATE INDEX "media_kind_idx" ON "media"("kind");
CREATE INDEX "media_status_createdAt_idx" ON "media"("status", "createdAt");
CREATE INDEX "media_visibility_idx" ON "media"("visibility");
CREATE INDEX "media_deletedAt_idx" ON "media"("deletedAt");
CREATE UNIQUE INDEX "media_variants_mediaId_name_key" ON "media_variants"("mediaId", "name");
CREATE UNIQUE INDEX "media_variants_storageProvider_bucket_storageKey_key" ON "media_variants"("storageProvider", "bucket", "storageKey");
CREATE INDEX "media_variants_mediaId_idx" ON "media_variants"("mediaId");
CREATE INDEX "media_references_mediaId_removedAt_idx" ON "media_references"("mediaId", "removedAt");
CREATE INDEX "media_references_targetType_targetId_purpose_removedAt_idx" ON "media_references"("targetType", "targetId", "purpose", "removedAt");
CREATE UNIQUE INDEX "media_upload_sessions_storageProvider_bucket_temporaryKey_key" ON "media_upload_sessions"("storageProvider", "bucket", "temporaryKey");
CREATE INDEX "media_upload_sessions_ownerId_status_idx" ON "media_upload_sessions"("ownerId", "status");
CREATE INDEX "media_upload_sessions_status_expiresAt_idx" ON "media_upload_sessions"("status", "expiresAt");
CREATE INDEX "media_audit_logs_mediaId_createdAt_idx" ON "media_audit_logs"("mediaId", "createdAt");
CREATE INDEX "media_audit_logs_actorId_createdAt_idx" ON "media_audit_logs"("actorId", "createdAt");
CREATE INDEX "media_audit_logs_correlationId_idx" ON "media_audit_logs"("correlationId");

ALTER TABLE "media" ADD CONSTRAINT "media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_upload_sessions" ADD CONSTRAINT "media_upload_sessions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_audit_logs" ADD CONSTRAINT "media_audit_logs_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
