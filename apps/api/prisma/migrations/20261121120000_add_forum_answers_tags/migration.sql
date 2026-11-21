-- AlterTable
ALTER TABLE "forum_topics" ADD COLUMN     "acceptedAnswerPostId" TEXT,
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedById" TEXT;

-- CreateTable
CREATE TABLE "forum_tags" (
    "id" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_topic_tags" (
    "topicId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "forum_topic_tags_pkey" PRIMARY KEY ("topicId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "forum_tags_forumId_slug_key" ON "forum_tags"("forumId", "slug");

-- CreateIndex
CREATE INDEX "forum_topic_tags_tagId_topicId_idx" ON "forum_topic_tags"("tagId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_topics_acceptedAnswerPostId_key" ON "forum_topics"("acceptedAnswerPostId");

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_acceptedAnswerPostId_fkey" FOREIGN KEY ("acceptedAnswerPostId") REFERENCES "forum_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_tags" ADD CONSTRAINT "forum_tags_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "forums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_tags" ADD CONSTRAINT "forum_topic_tags_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_tags" ADD CONSTRAINT "forum_topic_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "forum_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Accepted answer and tag invariants
ALTER TABLE "forum_topics"
  ADD CONSTRAINT "forum_topics_acceptance_complete"
    CHECK ((("acceptedAnswerPostId" IS NULL) = ("acceptedAt" IS NULL))
      AND (("acceptedAt" IS NULL) = ("acceptedById" IS NULL))),
  ADD CONSTRAINT "forum_topics_acceptance_only_questions"
    CHECK ("acceptedAnswerPostId" IS NULL OR "kind" = 'QUESTION');

ALTER TABLE "forum_tags"
  ADD CONSTRAINT "forum_tags_slug_grammar" CHECK ("slug" ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  ADD CONSTRAINT "forum_tags_label_length" CHECK (char_length(btrim("label")) BETWEEN 1 AND 40);

-- An accepted answer is a reply of the same topic.
CREATE FUNCTION enforce_forum_accepted_answer() RETURNS trigger AS $$
DECLARE
  answer_topic TEXT;
  answer_number INT;
BEGIN
  IF NEW."acceptedAnswerPostId" IS NOT NULL THEN
    SELECT "topicId", "number" INTO answer_topic, answer_number
    FROM "forum_posts" WHERE "id" = NEW."acceptedAnswerPostId";
    IF answer_topic IS DISTINCT FROM NEW."id" OR answer_number <= 1 THEN
      RAISE EXCEPTION 'The accepted answer must be a reply in the same topic.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_topics_accepted_answer"
BEFORE INSERT OR UPDATE OF "acceptedAnswerPostId" ON "forum_topics"
FOR EACH ROW EXECUTE FUNCTION enforce_forum_accepted_answer();

-- A topic only carries tags curated for its own forum.
CREATE FUNCTION enforce_forum_topic_tag_forum() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "forum_topics" t JOIN "forum_tags" g ON g."forumId" = t."forumId"
    WHERE t."id" = NEW."topicId" AND g."id" = NEW."tagId"
  ) THEN
    RAISE EXCEPTION 'A topic tag must belong to the topic''s forum.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_topic_tags_same_forum"
BEFORE INSERT OR UPDATE ON "forum_topic_tags"
FOR EACH ROW EXECUTE FUNCTION enforce_forum_topic_tag_forum();

/*
 * The best answer deserves a pin; the right tag deserves a curator.
 */
