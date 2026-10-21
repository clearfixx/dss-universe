ALTER TABLE "user_privacy_settings"
ADD COLUMN "allowWallPosts" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "user_wall_posts" (
    "id" TEXT NOT NULL,
    "profileOwnerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT,
    "imageMediaId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "deleteReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wall_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_wall_posts_profileOwnerId_createdAt_id_idx"
ON "user_wall_posts"("profileOwnerId", "createdAt", "id");

CREATE INDEX "user_wall_posts_authorId_createdAt_idx"
ON "user_wall_posts"("authorId", "createdAt");

CREATE INDEX "user_wall_posts_deletedAt_idx"
ON "user_wall_posts"("deletedAt");

ALTER TABLE "user_wall_posts"
ADD CONSTRAINT "user_wall_posts_profileOwnerId_fkey"
FOREIGN KEY ("profileOwnerId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_wall_posts"
ADD CONSTRAINT "user_wall_posts_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
