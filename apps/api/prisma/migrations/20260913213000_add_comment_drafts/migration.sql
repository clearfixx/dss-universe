-- CreateTable
CREATE TABLE "comment_drafts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "interactionTargetId" TEXT NOT NULL,
    "parentId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comment_drafts_authorId_scopeKey_key" ON "comment_drafts"("authorId", "scopeKey");

-- CreateIndex
CREATE INDEX "comment_drafts_authorId_updatedAt_id_idx" ON "comment_drafts"("authorId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "comment_drafts_interactionTargetId_updatedAt_idx" ON "comment_drafts"("interactionTargetId", "updatedAt");

-- CreateIndex
CREATE INDEX "comment_drafts_parentId_idx" ON "comment_drafts"("parentId");

-- AddForeignKey
ALTER TABLE "comment_drafts" ADD CONSTRAINT "comment_drafts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_drafts" ADD CONSTRAINT "comment_drafts_interactionTargetId_fkey" FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_drafts" ADD CONSTRAINT "comment_drafts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
