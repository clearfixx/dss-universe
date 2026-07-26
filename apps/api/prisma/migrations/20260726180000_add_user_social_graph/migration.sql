-- AlterTable
ALTER TABLE "user_privacy_settings"
ADD COLUMN "allowFollowers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showFollows" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key"
ON "user_follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "user_follows_followerId_deletedAt_createdAt_idx"
ON "user_follows"("followerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "user_follows_followingId_deletedAt_createdAt_idx"
ON "user_follows"("followingId", "deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_followerId_fkey"
FOREIGN KEY ("followerId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_followingId_fkey"
FOREIGN KEY ("followingId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
