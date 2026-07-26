-- Phase 7 normalized profile social links
CREATE TABLE "user_social_links" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "label" TEXT,
  "url" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_social_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_social_links_userId_platform_key"
ON "user_social_links"("userId", "platform");

CREATE INDEX "user_social_links_userId_deletedAt_position_idx"
ON "user_social_links"("userId", "deletedAt", "position");

ALTER TABLE "user_social_links"
ADD CONSTRAINT "user_social_links_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
