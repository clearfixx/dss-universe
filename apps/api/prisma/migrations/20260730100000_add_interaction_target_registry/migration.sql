/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260730100000_add_interaction_target_registry/migration.sql
 * Purpose: Adds canonical FK-backed interaction targets and binds Profile Wall posts.
 */

CREATE TYPE "InteractionTargetStatus" AS ENUM ('ACTIVE', 'LOCKED', 'RETIRED');

CREATE TABLE "interaction_targets" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ownerModule" TEXT NOT NULL,
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "status" "InteractionTargetStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interaction_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "interaction_targets_kind_check"
    CHECK ("kind" ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  CONSTRAINT "interaction_targets_owner_module_check"
    CHECK ("ownerModule" ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'),
  CONSTRAINT "interaction_targets_owner_type_check"
    CHECK (char_length(btrim("ownerType")) BETWEEN 2 AND 80),
  CONSTRAINT "interaction_targets_owner_id_check"
    CHECK (char_length(btrim("ownerId")) BETWEEN 1 AND 160)
);

CREATE UNIQUE INDEX "interaction_targets_ownerType_ownerId_key"
  ON "interaction_targets"("ownerType", "ownerId");
CREATE INDEX "interaction_targets_kind_status_idx"
  ON "interaction_targets"("kind", "status");
CREATE INDEX "interaction_targets_ownerModule_status_idx"
  ON "interaction_targets"("ownerModule", "status");

ALTER TABLE "user_wall_posts"
  ADD COLUMN "interactionTargetId" TEXT;

INSERT INTO "interaction_targets" (
  "id", "kind", "ownerModule", "ownerType", "ownerId", "status", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'users.profile-wall-post',
  'users',
  'UserWallPost',
  post."id",
  CASE
    WHEN post."deletedAt" IS NULL THEN 'ACTIVE'::"InteractionTargetStatus"
    ELSE 'LOCKED'::"InteractionTargetStatus"
  END,
  post."createdAt",
  post."updatedAt"
FROM "user_wall_posts" post;

UPDATE "user_wall_posts" post
SET "interactionTargetId" = target."id"
FROM "interaction_targets" target
WHERE target."ownerType" = 'UserWallPost'
  AND target."ownerId" = post."id";

ALTER TABLE "user_wall_posts"
  ALTER COLUMN "interactionTargetId" SET NOT NULL;

CREATE UNIQUE INDEX "user_wall_posts_interactionTargetId_key"
  ON "user_wall_posts"("interactionTargetId");

ALTER TABLE "user_wall_posts"
  ADD CONSTRAINT "user_wall_posts_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId")
  REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_interaction_target_identity()
RETURNS trigger AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."kind" <> OLD."kind"
    OR NEW."ownerModule" <> OLD."ownerModule"
    OR NEW."ownerType" <> OLD."ownerType"
    OR NEW."ownerId" <> OLD."ownerId"
    OR NEW."createdAt" <> OLD."createdAt"
  THEN
    RAISE EXCEPTION 'interaction target identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "interaction_targets_identity_immutable"
BEFORE UPDATE ON "interaction_targets"
FOR EACH ROW EXECUTE FUNCTION protect_interaction_target_identity();

CREATE OR REPLACE FUNCTION prevent_interaction_target_deletion()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'interaction targets must be retired, not deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "interaction_targets_no_delete"
BEFORE DELETE ON "interaction_targets"
FOR EACH ROW EXECUTE FUNCTION prevent_interaction_target_deletion();

/*
 * Shared interactions get one coordinate. Domain ownership keeps the map.
 */
