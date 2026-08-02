/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260802113000_add_comment_editor_documents/migration.sql
 * Purpose: Makes COMMENT editor JSON canonical while preserving legacy body projections.
 */

ALTER TABLE "comments"
  ADD COLUMN "document" JSONB,
  ADD COLUMN "searchText" TEXT;

ALTER TABLE "comment_revisions"
  ADD COLUMN "document" JSONB,
  ADD COLUMN "searchText" TEXT;

UPDATE "comments"
SET
  "document" = jsonb_build_object(
    'schemaVersion', 1,
    'profile', 'COMMENT',
    'content', jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', "body")
          )
        )
      )
    )
  ),
  "searchText" = lower(regexp_replace(btrim("body"), '\s+', ' ', 'g'))
WHERE "deletedAt" IS NULL;

UPDATE "comment_revisions"
SET
  "document" = jsonb_build_object(
    'schemaVersion', 1,
    'profile', 'COMMENT',
    'content', jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', "body")
          )
        )
      )
    )
  ),
  "searchText" = lower(regexp_replace(btrim("body"), '\s+', ' ', 'g'));

ALTER TABLE "comment_revisions"
  ALTER COLUMN "document" SET NOT NULL,
  ALTER COLUMN "searchText" SET NOT NULL;

ALTER TABLE "comments"
  DROP CONSTRAINT "comments_body_state_check";

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_content_state_check" CHECK (
    (
      "deletedAt" IS NULL
      AND "body" IS NOT NULL
      AND char_length("body") <= 5000
      AND "document" IS NOT NULL
      AND "document"->>'profile' = 'COMMENT'
      AND "searchText" IS NOT NULL
    )
    OR (
      "deletedAt" IS NOT NULL
      AND "body" IS NULL
      AND "document" IS NULL
      AND "searchText" IS NULL
    )
  );

ALTER TABLE "comment_revisions"
  DROP CONSTRAINT "comment_revisions_body_check";

ALTER TABLE "comment_revisions"
  ADD CONSTRAINT "comment_revisions_content_check" CHECK (
    char_length("body") <= 5000
    AND "document"->>'profile' = 'COMMENT'
  );

/*
 * Legacy text keeps its public seat; canonical JSON now owns the flight plan.
 */
