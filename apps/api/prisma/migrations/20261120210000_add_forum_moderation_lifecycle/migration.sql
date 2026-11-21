-- CreateEnum
CREATE TYPE "ForumStaffRole" AS ENUM ('CURATOR', 'MODERATOR', 'SUPERMODERATOR', 'ADMINISTRATOR');

-- AlterTable
ALTER TABLE "forum_posts" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "purgeReason" TEXT,
ADD COLUMN     "purgedAt" TIMESTAMP(3),
ADD COLUMN     "purgedById" TEXT;

-- CreateTable
CREATE TABLE "forum_post_staff_notes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" "ForumStaffRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,

    CONSTRAINT "forum_post_staff_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_post_staff_notes_postId_createdAt_id_idx" ON "forum_post_staff_notes"("postId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "forum_post_staff_notes" ADD CONSTRAINT "forum_post_staff_notes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_staff_notes" ADD CONSTRAINT "forum_post_staff_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_post_staff_notes" ADD CONSTRAINT "forum_post_staff_notes_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Moderation state invariants
ALTER TABLE "forum_posts"
  ADD CONSTRAINT "forum_posts_moderation_complete"
    CHECK (("state" IN ('HIDDEN', 'DELETED')) =
      ("moderatedAt" IS NOT NULL AND "moderatedById" IS NOT NULL AND "moderationReason" IS NOT NULL)
      OR "state" = 'PURGED'),
  ADD CONSTRAINT "forum_posts_moderation_reason_length"
    CHECK ("moderationReason" IS NULL OR char_length(btrim("moderationReason")) BETWEEN 3 AND 1000),
  ADD CONSTRAINT "forum_posts_purge_complete"
    CHECK (("state" = 'PURGED') =
      ("purgedAt" IS NOT NULL AND "purgedById" IS NOT NULL AND "purgeReason" IS NOT NULL)),
  ADD CONSTRAINT "forum_posts_purge_reason_length"
    CHECK ("purgeReason" IS NULL OR char_length(btrim("purgeReason")) BETWEEN 3 AND 1000);

ALTER TABLE "forum_post_staff_notes"
  ADD CONSTRAINT "forum_post_staff_notes_body_length"
    CHECK (char_length(btrim("body")) BETWEEN 1 AND 2000),
  ADD CONSTRAINT "forum_post_staff_notes_removal_complete"
    CHECK (("removedAt" IS NULL) = ("removedById" IS NULL));

-- PURGED is terminal and keeps no content.
CREATE FUNCTION enforce_forum_post_purge() RETURNS trigger AS $$
BEGIN
  IF OLD."state" = 'PURGED' AND (NEW."state" <> 'PURGED'
    OR NEW."document"::text <> OLD."document"::text
    OR NEW."plainText" <> OLD."plainText") THEN
    RAISE EXCEPTION 'A purged forum post cannot change.';
  END IF;
  IF NEW."state" = 'PURGED' AND (NEW."plainText" <> '' OR NEW."searchText" <> '') THEN
    RAISE EXCEPTION 'A purged forum post must not keep content.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forum_posts_purge_terminal"
BEFORE UPDATE ON "forum_posts"
FOR EACH ROW EXECUTE FUNCTION enforce_forum_post_purge();

-- Revisions stay immutable except for an administrator purge, which may only
-- erase revision content inside a transaction that declares the purge.
CREATE OR REPLACE FUNCTION prevent_forum_revision_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND current_setting('dss.forum_purge', true) = 'on'
    AND NEW."id" = OLD."id" AND NEW."postId" = OLD."postId"
    AND NEW."revision" = OLD."revision" AND NEW."editorId" = OLD."editorId"
    AND NEW."createdAt" = OLD."createdAt"
    AND NEW."plainText" = '' AND NEW."document"::text = '{}' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Forum post revisions are immutable.';
END;
$$ LANGUAGE plpgsql;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(), 'forum.content.purge', 'Purge forum content',
  'Allows physically erasing forum post content for legal, security or privacy reasons.',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'forum.content.purge'
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

/*
 * Deleting is a curtain; purging is a shredder. Only one of them is reversible.
 */
