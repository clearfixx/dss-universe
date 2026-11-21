-- AlterTable
ALTER TABLE "forum_topics" ADD COLUMN     "ratingDown" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingUp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "forum_posts" ADD COLUMN     "ratingDown" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingUp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "forum_post_votes" (
    "postId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,

    CONSTRAINT "forum_post_votes_pkey" PRIMARY KEY ("postId","voterId")
);

-- CreateTable
CREATE TABLE "forum_ranking_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "hotGravitySeconds" INTEGER NOT NULL DEFAULT 45000,
    "hotReplyWeight" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_ranking_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_topic_views" (
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_topic_views_pkey" PRIMARY KEY ("topicId","userId")
);

-- CreateTable
CREATE TABLE "forum_topic_read_states" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "lastReadNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_topic_read_states_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateIndex
CREATE INDEX "forum_post_votes_postId_createdAt_idx" ON "forum_post_votes"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "forum_post_votes" ADD CONSTRAINT "forum_post_votes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_votes" ADD CONSTRAINT "forum_post_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_votes" ADD CONSTRAINT "forum_post_votes_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_views" ADD CONSTRAINT "forum_topic_views_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_views" ADD CONSTRAINT "forum_topic_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_read_states" ADD CONSTRAINT "forum_topic_read_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_read_states" ADD CONSTRAINT "forum_topic_read_states_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Vote and counter invariants
ALTER TABLE "forum_post_votes"
  ADD CONSTRAINT "forum_post_votes_value" CHECK ("value" IN (-1, 1)),
  ADD CONSTRAINT "forum_post_votes_reversal_complete"
    CHECK ((("reversedAt" IS NULL) = ("reversedById" IS NULL))
      AND (("reversedAt" IS NULL) = ("reversalReason" IS NULL))
      AND ("reversalReason" IS NULL OR char_length(btrim("reversalReason")) BETWEEN 3 AND 1000));

ALTER TABLE "forum_posts"
  ADD CONSTRAINT "forum_posts_rating_non_negative" CHECK ("ratingUp" >= 0 AND "ratingDown" >= 0);

ALTER TABLE "forum_topics"
  ADD CONSTRAINT "forum_topics_rating_non_negative"
    CHECK ("ratingUp" >= 0 AND "ratingDown" >= 0 AND "viewCount" >= 0);

ALTER TABLE "forum_topic_read_states"
  ADD CONSTRAINT "forum_topic_read_states_number" CHECK ("lastReadNumber" >= 0);

ALTER TABLE "forum_ranking_settings"
  ADD CONSTRAINT "forum_ranking_settings_singleton" CHECK ("id" = 'default'),
  ADD CONSTRAINT "forum_ranking_settings_bounds"
    CHECK ("hotGravitySeconds" BETWEEN 3600 AND 2592000
      AND "hotReplyWeight" BETWEEN 0 AND 10);

INSERT INTO "forum_ranking_settings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Votes are final: never deleted; only a single moderator reversal may be recorded.
CREATE FUNCTION enforce_forum_vote_finality() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Forum votes are final.';
  END IF;
  IF NEW."postId" <> OLD."postId" OR NEW."voterId" <> OLD."voterId"
    OR NEW."value" <> OLD."value" OR NEW."createdAt" <> OLD."createdAt"
    OR OLD."reversedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Forum votes cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_post_votes_final"
BEFORE UPDATE OR DELETE ON "forum_post_votes"
FOR EACH ROW EXECUTE FUNCTION enforce_forum_vote_finality();

/*
 * A vote says something about a post, never about the person who wrote it.
 */
