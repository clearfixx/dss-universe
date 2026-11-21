-- Phase 13 G2: Forum as a qualified Community Points producer.
-- Owner decisions: topic +5 (10/day), reply +1 (50/day), accepted answer +10
-- (10/day); points are never revoked; a post earns the answer bonus once.

-- AlterTable
ALTER TABLE "forum_posts" ADD COLUMN     "firstAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "firstAcceptedById" TEXT;

ALTER TABLE "forum_posts"
  ADD CONSTRAINT "forum_posts_first_acceptance_complete"
  CHECK (("firstAcceptedAt" IS NULL) = ("firstAcceptedById" IS NULL));

-- The first acceptance is the points source: once written it never changes.
CREATE FUNCTION prevent_forum_first_acceptance_change() RETURNS trigger AS $$
BEGIN
  IF OLD."firstAcceptedAt" IS NOT NULL AND (
    NEW."firstAcceptedAt" IS DISTINCT FROM OLD."firstAcceptedAt" OR
    NEW."firstAcceptedById" IS DISTINCT FROM OLD."firstAcceptedById"
  ) THEN
    RAISE EXCEPTION 'The first acceptance of a forum post is immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_posts_first_acceptance_immutable"
BEFORE UPDATE OF "firstAcceptedAt", "firstAcceptedById" ON "forum_posts"
FOR EACH ROW EXECUTE FUNCTION prevent_forum_first_acceptance_change();

-- The topic rule waited on a dormant event name; Forum now emits the real one.
UPDATE "community_point_rules"
SET "eventName" = 'forum.topic.created.v1', "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'forum.topic.created' AND "eventName" = 'community.topic.created.v1';

INSERT INTO "community_point_rules"
    ("key", "eventName", "payloadValue", "points", "dailyLimit", "enabled", "createdAt", "updatedAt")
VALUES
    ('forum.reply.created', 'forum.post.created.v1', NULL, 1, 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('forum.answer.accepted', 'forum.answer.credited.v1', NULL, 10, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
