ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "reactionTargetId" TEXT;
ALTER TABLE "comments" ALTER COLUMN "reactionTargetId" TYPE TEXT
  USING "reactionTargetId"::text;

INSERT INTO "interaction_targets" (
  "id", "kind", "ownerModule", "ownerType", "ownerId", "status", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'comment',
  'interactions',
  'Comment',
  "id",
  'ACTIVE'::"InteractionTargetStatus",
  "createdAt",
  "updatedAt"
FROM "comments"
WHERE NOT EXISTS (
  SELECT 1
  FROM "interaction_targets" AS existing
  WHERE existing."ownerType" = 'Comment'
    AND existing."ownerId" = "comments"."id"
);

UPDATE "comments" AS comment
SET "reactionTargetId" = target."id"
FROM "interaction_targets" AS target
WHERE target."ownerType" = 'Comment'
  AND target."ownerId" = comment."id";

ALTER TABLE "comments" ALTER COLUMN "reactionTargetId" SET NOT NULL;

CREATE UNIQUE INDEX "comments_reactionTargetId_key"
  ON "comments"("reactionTargetId");

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_reactionTargetId_fkey"
  FOREIGN KEY ("reactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
