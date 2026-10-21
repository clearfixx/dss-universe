CREATE TYPE "ShareChannel" AS ENUM (
  'FACEBOOK',
  'X',
  'THREADS',
  'INSTAGRAM',
  'PINTEREST',
  'COPY_LINK',
  'PRINT'
);

CREATE TABLE "interaction_views" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "actorId" TEXT,
  "viewerKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interaction_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interaction_shares" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "actorId" TEXT,
  "viewerKey" TEXT NOT NULL,
  "channel" "ShareChannel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interaction_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interaction_views_interactionTargetId_viewerKey_key"
  ON "interaction_views"("interactionTargetId", "viewerKey");
CREATE INDEX "interaction_views_interactionTargetId_createdAt_idx"
  ON "interaction_views"("interactionTargetId", "createdAt");
CREATE INDEX "interaction_views_actorId_createdAt_idx"
  ON "interaction_views"("actorId", "createdAt");

CREATE UNIQUE INDEX "interaction_shares_interactionTargetId_channel_viewerKey_key"
  ON "interaction_shares"("interactionTargetId", "channel", "viewerKey");
CREATE INDEX "interaction_shares_interactionTargetId_channel_idx"
  ON "interaction_shares"("interactionTargetId", "channel");
CREATE INDEX "interaction_shares_actorId_createdAt_idx"
  ON "interaction_shares"("actorId", "createdAt");

ALTER TABLE "interaction_views"
  ADD CONSTRAINT "interaction_views_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_views"
  ADD CONSTRAINT "interaction_views_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "interaction_shares"
  ADD CONSTRAINT "interaction_shares_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interaction_shares"
  ADD CONSTRAINT "interaction_shares_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
