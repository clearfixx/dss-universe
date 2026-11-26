-- Forum trash (P1 B07): when and by whom a topic was moved to the trash.
ALTER TABLE "forum_topics"
  ADD COLUMN "trashedAt" TIMESTAMP(3),
  ADD COLUMN "trashedById" TEXT;

-- Backfill topics already in the trash from their latest trash audit record.
UPDATE "forum_topics" AS t
SET "trashedAt" = a."occurredAt",
    "trashedById" = a."actorId"
FROM (
  SELECT DISTINCT ON ("targetId") "targetId", "occurredAt", "actorId"
  FROM "audit_records"
  WHERE "action" = 'forum.topic_trashed' AND "targetType" = 'ForumTopic'
  ORDER BY "targetId", "occurredAt" DESC
) AS a
WHERE t."state" = 'TRASHED' AND t."id" = a."targetId";

CREATE INDEX "forum_topics_state_trashedAt_idx" ON "forum_topics"("state", "trashedAt");
