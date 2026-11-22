-- CreateTable
CREATE TABLE "forum_follows" (
    "userId" TEXT NOT NULL,
    "forumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_follows_pkey" PRIMARY KEY ("userId","forumId")
);

-- CreateIndex
CREATE INDEX "forum_follows_forumId_createdAt_idx" ON "forum_follows"("forumId", "createdAt");

-- AddForeignKey
ALTER TABLE "forum_follows" ADD CONSTRAINT "forum_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_follows" ADD CONSTRAINT "forum_follows_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "forums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
