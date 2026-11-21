-- AlterTable
ALTER TABLE "forum_topics" ADD COLUMN     "mergedIntoTopicId" TEXT;

-- AlterTable
ALTER TABLE "forum_posts" ADD COLUMN     "originalNumber" INTEGER,
ADD COLUMN     "originalTopicId" TEXT;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_mergedIntoTopicId_fkey" FOREIGN KEY ("mergedIntoTopicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A merged topic keeps its identity as a redirect without posts.
ALTER TABLE "forum_topics" DROP CONSTRAINT "forum_topics_counters";
ALTER TABLE "forum_topics"
  ADD CONSTRAINT "forum_topics_counters"
    CHECK (("postCount" >= 1 OR "mergedIntoTopicId" IS NOT NULL)
      AND "postCount" >= 0 AND "lastPostNumber" >= "postCount"),
  ADD CONSTRAINT "forum_topics_not_merged_into_self"
    CHECK ("mergedIntoTopicId" IS NULL OR "mergedIntoTopicId" <> "id");

ALTER TABLE "forum_posts"
  ADD CONSTRAINT "forum_posts_original_coordinates"
    CHECK (("originalTopicId" IS NULL) = ("originalNumber" IS NULL)
      AND ("originalNumber" IS NULL OR "originalNumber" >= 1));

/*
 * Posts may change rooms; they always remember where they were born.
 */
