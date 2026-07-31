/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260731100000_add_comment_mentions_foundation/migration.sql
 * Purpose: Adds durable, retractable comment mentions backed by real user and target relations.
 */

CREATE TABLE "mentions" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retractedAt" TIMESTAMP(3),
  CONSTRAINT "mentions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mentions_not_self_check" CHECK ("actorId" <> "recipientId")
);

CREATE UNIQUE INDEX "mentions_commentId_recipientId_key"
  ON "mentions"("commentId", "recipientId");
CREATE INDEX "mentions_recipientId_retractedAt_activatedAt_id_idx"
  ON "mentions"("recipientId", "retractedAt", "activatedAt", "id");
CREATE INDEX "mentions_commentId_retractedAt_idx"
  ON "mentions"("commentId", "retractedAt");
CREATE INDEX "mentions_interactionTargetId_createdAt_idx"
  ON "mentions"("interactionTargetId", "createdAt");

ALTER TABLE "mentions"
  ADD CONSTRAINT "mentions_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mentions"
  ADD CONSTRAINT "mentions_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "comments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mentions"
  ADD CONSTRAINT "mentions_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mentions"
  ADD CONSTRAINT "mentions_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_mention_invariants()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."interactionTargetId" IS DISTINCT FROM OLD."interactionTargetId"
    OR NEW."commentId" IS DISTINCT FROM OLD."commentId"
    OR NEW."actorId" IS DISTINCT FROM OLD."actorId"
    OR NEW."recipientId" IS DISTINCT FROM OLD."recipientId"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'mention identity is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "mentions_enforce_invariants"
BEFORE UPDATE ON "mentions"
FOR EACH ROW EXECUTE FUNCTION enforce_mention_invariants();

/*
 * A mention is a signal, not a copied username; identities may evolve without rewriting history.
 */
