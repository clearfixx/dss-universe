-- Phase 10.4–10.5 — Post templates and editorial workflow
CREATE TYPE "NewsEditorialAction" AS ENUM (
  'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED'
);

ALTER TABLE "news_articles"
  ADD COLUMN "templateData" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "approvedVersion" INTEGER;

ALTER TABLE "news_revisions"
  ADD COLUMN "templateData" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "news_editorial_decisions" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "revisionVersion" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" "NewsEditorialAction" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_editorial_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "news_editorial_decisions_articleId_createdAt_id_idx" ON "news_editorial_decisions"("articleId", "createdAt", "id");
CREATE INDEX "news_editorial_decisions_actorId_action_createdAt_idx" ON "news_editorial_decisions"("actorId", "action", "createdAt");

ALTER TABLE "news_editorial_decisions" ADD CONSTRAINT "news_editorial_decisions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "news_editorial_decisions" ADD CONSTRAINT "news_editorial_decisions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
