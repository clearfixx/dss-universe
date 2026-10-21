-- Phase 10 — News domain foundation
CREATE TYPE "NewsArticleStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED'
);

CREATE TYPE "NewsPostType" AS ENUM (
  'STANDARD',
  'TEXT',
  'GALLERY',
  'VIDEO',
  'AUDIO'
);

CREATE TYPE "NewsVisibility" AS ENUM ('PUBLIC', 'MEMBERS');

CREATE TABLE "news_articles" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "postType" "NewsPostType" NOT NULL DEFAULT 'STANDARD',
  "status" "NewsArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "NewsVisibility" NOT NULL DEFAULT 'PUBLIC',
  "language" TEXT NOT NULL DEFAULT 'uk',
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortText" TEXT NOT NULL,
  "document" JSONB NOT NULL,
  "plainText" TEXT NOT NULL,
  "searchText" TEXT NOT NULL,
  "coverMediaId" TEXT,
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "allowComments" BOOLEAN NOT NULL DEFAULT true,
  "allowRating" BOOLEAN NOT NULL DEFAULT true,
  "allowSharing" BOOLEAN NOT NULL DEFAULT true,
  "allowIndexing" BOOLEAN NOT NULL DEFAULT true,
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT true,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "displayPublishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_revisions" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "editorId" TEXT NOT NULL,
  "postType" "NewsPostType" NOT NULL,
  "language" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortText" TEXT NOT NULL,
  "document" JSONB NOT NULL,
  "plainText" TEXT NOT NULL,
  "searchText" TEXT NOT NULL,
  "coverMediaId" TEXT,
  "changeSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "news_articles_interactionTargetId_key" ON "news_articles"("interactionTargetId");
CREATE UNIQUE INDEX "news_articles_language_slug_key" ON "news_articles"("language", "slug");
CREATE INDEX "news_articles_status_publishedAt_id_idx" ON "news_articles"("status", "publishedAt", "id");
CREATE INDEX "news_articles_authorId_status_updatedAt_idx" ON "news_articles"("authorId", "status", "updatedAt");
CREATE INDEX "news_articles_postType_status_publishedAt_idx" ON "news_articles"("postType", "status", "publishedAt");
CREATE UNIQUE INDEX "news_revisions_articleId_version_key" ON "news_revisions"("articleId", "version");
CREATE INDEX "news_revisions_editorId_createdAt_idx" ON "news_revisions"("editorId", "createdAt");

ALTER TABLE "news_articles"
  ADD CONSTRAINT "news_articles_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "news_articles"
  ADD CONSTRAINT "news_articles_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "news_revisions"
  ADD CONSTRAINT "news_revisions_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "news_articles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "news_revisions"
  ADD CONSTRAINT "news_revisions_editorId_fkey"
  FOREIGN KEY ("editorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
