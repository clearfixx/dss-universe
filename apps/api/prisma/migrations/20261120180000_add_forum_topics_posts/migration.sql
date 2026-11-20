-- CreateEnum
CREATE TYPE "ForumTopicKind" AS ENUM ('DISCUSSION', 'QUESTION');

-- CreateEnum
CREATE TYPE "ForumTopicState" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED', 'TRASHED');

-- CreateEnum
CREATE TYPE "ForumPostState" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED', 'PURGED');

-- CreateTable
CREATE TABLE "forum_topics" (
    "id" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "interactionTargetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "ForumTopicKind" NOT NULL DEFAULT 'DISCUSSION',
    "title" TEXT NOT NULL,
    "state" "ForumTopicState" NOT NULL DEFAULT 'OPEN',
    "stateBeforeTrash" "ForumTopicState",
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "curatorId" TEXT,
    "postCount" INTEGER NOT NULL DEFAULT 1,
    "lastPostNumber" INTEGER NOT NULL DEFAULT 1,
    "lastPostAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPostAuthorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "state" "ForumPostState" NOT NULL DEFAULT 'VISIBLE',
    "document" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "replyToNumber" INTEGER,
    "quotedNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "lastEditorId" TEXT,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_post_revisions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posting_cooldowns" (
    "userId" TEXT NOT NULL,
    "lastPostAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_posting_cooldowns_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "forum_topics_interactionTargetId_key" ON "forum_topics"("interactionTargetId");

-- CreateIndex
CREATE INDEX "forum_topics_forumId_pinned_lastPostAt_id_idx" ON "forum_topics"("forumId", "pinned", "lastPostAt", "id");

-- CreateIndex
CREATE INDEX "forum_topics_forumId_pinned_createdAt_id_idx" ON "forum_topics"("forumId", "pinned", "createdAt", "id");

-- CreateIndex
CREATE INDEX "forum_topics_authorId_createdAt_idx" ON "forum_topics"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "forum_posts_authorId_createdAt_idx" ON "forum_posts"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "forum_posts_topicId_number_key" ON "forum_posts"("topicId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "forum_post_revisions_postId_revision_key" ON "forum_post_revisions"("postId", "revision");

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "forums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_interactionTargetId_fkey" FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posting_cooldowns" ADD CONSTRAINT "forum_posting_cooldowns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Topic and post invariants
ALTER TABLE "forum_topics"
  ADD CONSTRAINT "forum_topics_title_length" CHECK (char_length(btrim("title")) BETWEEN 3 AND 200),
  ADD CONSTRAINT "forum_topics_counters" CHECK ("postCount" >= 1 AND "lastPostNumber" >= "postCount"),
  ADD CONSTRAINT "forum_topics_trash_memory"
    CHECK (("state" = 'TRASHED') = ("stateBeforeTrash" IS NOT NULL)
      AND ("stateBeforeTrash" IS NULL OR "stateBeforeTrash" <> 'TRASHED'));

ALTER TABLE "forum_posts"
  ADD CONSTRAINT "forum_posts_number_positive" CHECK ("number" >= 1),
  ADD CONSTRAINT "forum_posts_revision_positive" CHECK ("revision" >= 1),
  ADD CONSTRAINT "forum_posts_reply_before_self"
    CHECK ("replyToNumber" IS NULL OR ("replyToNumber" >= 1 AND "replyToNumber" < "number")),
  ADD CONSTRAINT "forum_posts_quotes_bounded"
    CHECK (cardinality("quotedNumbers") <= 20);

ALTER TABLE "forum_post_revisions"
  ADD CONSTRAINT "forum_post_revisions_positive" CHECK ("revision" >= 1);

-- Revision history is immutable.
CREATE FUNCTION prevent_forum_revision_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Forum post revisions are immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_post_revisions_immutable"
BEFORE UPDATE OR DELETE ON "forum_post_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_forum_revision_mutation();

-- Posts are never deleted; removal is a state change (CH-1b tombstones).
CREATE FUNCTION prevent_forum_post_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Forum posts are never deleted; use a tombstone state.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_posts_no_delete"
BEFORE DELETE ON "forum_posts"
FOR EACH ROW EXECUTE FUNCTION prevent_forum_post_delete();

CREATE TRIGGER "forum_topics_no_delete"
BEFORE DELETE ON "forum_topics"
FOR EACH ROW EXECUTE FUNCTION prevent_forum_post_delete();

/*
 * Every reply gets a number; every number keeps its place.
 */
