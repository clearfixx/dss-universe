-- Phase 10 News correction — configurable pagination and SEO interlinking
CREATE TYPE "NewsPaginationMode" AS ENUM (
  'DISABLED', 'PAGES', 'LOAD_MORE', 'BOTH'
);

CREATE TYPE "NewsInternalLinkType" AS ENUM (
  'RELATED', 'CONTEXTUAL', 'SERIES'
);

CREATE TABLE "news_settings" (
  "id" TEXT NOT NULL,
  "newsPaginationMode" "NewsPaginationMode" NOT NULL DEFAULT 'BOTH',
  "newsPaginationThreshold" INTEGER NOT NULL DEFAULT 12,
  "newsPageSize" INTEGER NOT NULL DEFAULT 12,
  "commentsPaginationMode" "NewsPaginationMode" NOT NULL DEFAULT 'BOTH',
  "commentsPaginationThreshold" INTEGER NOT NULL DEFAULT 20,
  "commentsPageSize" INTEGER NOT NULL DEFAULT 20,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_internal_links" (
  "id" TEXT NOT NULL,
  "sourceArticleId" TEXT NOT NULL,
  "targetArticleId" TEXT NOT NULL,
  "type" "NewsInternalLinkType" NOT NULL DEFAULT 'RELATED',
  "anchorText" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_internal_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "news_internal_links_no_self" CHECK ("sourceArticleId" <> "targetArticleId")
);

CREATE UNIQUE INDEX "news_internal_links_sourceArticleId_targetArticleId_type_key"
  ON "news_internal_links"("sourceArticleId", "targetArticleId", "type");
CREATE INDEX "news_internal_links_sourceArticleId_position_id_idx"
  ON "news_internal_links"("sourceArticleId", "position", "id");
CREATE INDEX "news_internal_links_targetArticleId_type_idx"
  ON "news_internal_links"("targetArticleId", "type");

ALTER TABLE "news_settings"
  ADD CONSTRAINT "news_settings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "news_internal_links"
  ADD CONSTRAINT "news_internal_links_sourceArticleId_fkey"
  FOREIGN KEY ("sourceArticleId") REFERENCES "news_articles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_internal_links"
  ADD CONSTRAINT "news_internal_links_targetArticleId_fkey"
  FOREIGN KEY ("targetArticleId") REFERENCES "news_articles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_internal_links"
  ADD CONSTRAINT "news_internal_links_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "news_settings" (
  "id", "newsPaginationMode", "newsPaginationThreshold", "newsPageSize",
  "commentsPaginationMode", "commentsPaginationThreshold", "commentsPageSize",
  "updatedAt"
) VALUES (
  'default', 'BOTH', 12, 12, 'BOTH', 20, 20, CURRENT_TIMESTAMP
);
