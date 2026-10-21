/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260730110000_add_shared_comments_foundation/migration.sql
 * Purpose: Adds FK-backed shared comments, reply trees, revisions and tombstones.
 */

CREATE TABLE "comments" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "body" TEXT,
  "editedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "deletedById" TEXT,
  "deleteReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comments_body_state_check" CHECK (
    ("deletedAt" IS NULL AND "body" IS NOT NULL AND char_length(btrim("body")) BETWEEN 1 AND 5000)
    OR ("deletedAt" IS NOT NULL AND "body" IS NULL)
  ),
  CONSTRAINT "comments_delete_state_check" CHECK (
    ("deletedAt" IS NULL AND "deletedById" IS NULL AND "deleteReason" IS NULL)
    OR ("deletedAt" IS NOT NULL AND "deletedById" IS NOT NULL)
  ),
  CONSTRAINT "comments_not_self_parent_check" CHECK ("parentId" IS NULL OR "parentId" <> "id")
);

CREATE TABLE "comment_revisions" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "editorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comment_revisions_version_check" CHECK ("version" > 0),
  CONSTRAINT "comment_revisions_body_check" CHECK (
    char_length(btrim("body")) BETWEEN 1 AND 5000
  )
);

CREATE INDEX "comments_interactionTargetId_parentId_createdAt_id_idx"
  ON "comments"("interactionTargetId", "parentId", "createdAt", "id");
CREATE INDEX "comments_authorId_createdAt_idx"
  ON "comments"("authorId", "createdAt");
CREATE INDEX "comments_parentId_createdAt_id_idx"
  ON "comments"("parentId", "createdAt", "id");
CREATE INDEX "comments_deletedAt_idx" ON "comments"("deletedAt");
CREATE UNIQUE INDEX "comment_revisions_commentId_version_key"
  ON "comment_revisions"("commentId", "version");
CREATE INDEX "comment_revisions_commentId_createdAt_idx"
  ON "comment_revisions"("commentId", "createdAt");
CREATE INDEX "comment_revisions_editorId_createdAt_idx"
  ON "comment_revisions"("editorId", "createdAt");

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "comments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comment_revisions"
  ADD CONSTRAINT "comment_revisions_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "comments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comment_revisions"
  ADD CONSTRAINT "comment_revisions_editorId_fkey"
  FOREIGN KEY ("editorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_comment_invariants()
RETURNS trigger AS $$
DECLARE
  parent_target_id TEXT;
  grandparent_id TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."interactionTargetId" IS DISTINCT FROM OLD."interactionTargetId"
    OR NEW."authorId" IS DISTINCT FROM OLD."authorId"
    OR NEW."parentId" IS DISTINCT FROM OLD."parentId"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'comment identity is immutable';
  END IF;

  IF NEW."parentId" IS NOT NULL THEN
    SELECT "interactionTargetId", "parentId"
    INTO parent_target_id, grandparent_id
    FROM "comments"
    WHERE "id" = NEW."parentId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'comment parent does not exist';
    END IF;

    IF parent_target_id <> NEW."interactionTargetId" THEN
      RAISE EXCEPTION 'comment parent must belong to the same interaction target';
    END IF;

    IF grandparent_id IS NOT NULL THEN
      RAISE EXCEPTION 'comment replies support one nesting level';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "comments_enforce_invariants"
BEFORE INSERT OR UPDATE OF "id", "interactionTargetId", "authorId", "parentId", "createdAt"
ON "comments"
FOR EACH ROW EXECUTE FUNCTION enforce_comment_invariants();

CREATE OR REPLACE FUNCTION prevent_comment_revision_changes()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'comment revisions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "comment_revisions_no_update"
BEFORE UPDATE ON "comment_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_comment_revision_changes();

CREATE TRIGGER "comment_revisions_no_delete"
BEFORE DELETE ON "comment_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_comment_revision_changes();

/*
 * Comments may change their minds; revision history keeps the receipts.
 */
