-- Phase 10.6 — Scheduled News publication
ALTER TYPE "NewsEditorialAction" ADD VALUE 'SCHEDULED';
ALTER TYPE "NewsEditorialAction" ADD VALUE 'SCHEDULE_CANCELLED';

ALTER TABLE "news_articles"
  ADD COLUMN "scheduledFor" TIMESTAMP(3),
  ADD COLUMN "scheduledById" TEXT;

CREATE INDEX "news_articles_status_scheduledFor_id_idx"
  ON "news_articles"("status", "scheduledFor", "id");

ALTER TABLE "news_articles"
  ADD CONSTRAINT "news_articles_scheduledById_fkey"
  FOREIGN KEY ("scheduledById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
