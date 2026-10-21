-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key"
ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "user_blocks_blockerId_deletedAt_createdAt_idx"
ON "user_blocks"("blockerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_deletedAt_idx"
ON "user_blocks"("blockedId", "deletedAt");

-- AddForeignKey
ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_blockerId_fkey"
FOREIGN KEY ("blockerId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_blockedId_fkey"
FOREIGN KEY ("blockedId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
