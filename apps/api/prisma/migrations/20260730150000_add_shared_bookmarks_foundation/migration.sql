/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260730150000_add_shared_bookmarks_foundation/migration.sql
 * Purpose: Adds private, idempotent saved-item relationships for interaction targets.
 */

CREATE TABLE "bookmarks" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookmarks_interactionTargetId_ownerId_key"
  ON "bookmarks"("interactionTargetId", "ownerId");
CREATE INDEX "bookmarks_ownerId_createdAt_id_idx"
  ON "bookmarks"("ownerId", "createdAt", "id");

ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookmarks"
  ADD CONSTRAINT "bookmarks_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_bookmark_updates()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'bookmark identity is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bookmarks_no_update"
BEFORE UPDATE ON "bookmarks"
FOR EACH ROW EXECUTE FUNCTION prevent_bookmark_updates();

/*
 * A bookmark remembers where to return; the owner module still checks the door.
 */
