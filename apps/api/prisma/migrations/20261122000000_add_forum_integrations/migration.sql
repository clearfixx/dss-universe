-- CreateTable
CREATE TABLE "forum_topic_subscriptions" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_topic_subscriptions_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateTable
CREATE TABLE "forum_news_discussions" (
    "newsArticleId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "linkedById" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_news_discussions_pkey" PRIMARY KEY ("newsArticleId")
);

-- CreateIndex
CREATE INDEX "forum_topic_subscriptions_topicId_createdAt_idx" ON "forum_topic_subscriptions"("topicId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "forum_news_discussions_topicId_key" ON "forum_news_discussions"("topicId");

-- AddForeignKey
ALTER TABLE "forum_topic_subscriptions" ADD CONSTRAINT "forum_topic_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topic_subscriptions" ADD CONSTRAINT "forum_topic_subscriptions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_news_discussions" ADD CONSTRAINT "forum_news_discussions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_news_discussions" ADD CONSTRAINT "forum_news_discussions_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


/*
 * Every article deserves one place to talk about it.
 */
