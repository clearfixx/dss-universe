/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260730130000_add_shared_reactions_foundation/migration.sql
 * Purpose: Adds idempotent shared reactions and rebuildable vote aggregates.
 */

CREATE TYPE "ReactionKind" AS ENUM ('LIKE', 'UPVOTE', 'DOWNVOTE');

CREATE TABLE "reactions" (
  "id" TEXT NOT NULL,
  "interactionTargetId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "kind" "ReactionKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reaction_aggregates" (
  "interactionTargetId" TEXT NOT NULL,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "upvotes" INTEGER NOT NULL DEFAULT 0,
  "downvotes" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reaction_aggregates_pkey" PRIMARY KEY ("interactionTargetId"),
  CONSTRAINT "reaction_aggregates_non_negative_check" CHECK (
    "likes" >= 0 AND "upvotes" >= 0 AND "downvotes" >= 0 AND "total" >= 0
  ),
  CONSTRAINT "reaction_aggregates_total_check" CHECK (
    "total" = "likes" + "upvotes" + "downvotes"
  ),
  CONSTRAINT "reaction_aggregates_score_check" CHECK (
    "score" = "upvotes" - "downvotes"
  )
);

CREATE UNIQUE INDEX "reactions_interactionTargetId_actorId_key"
  ON "reactions"("interactionTargetId", "actorId");
CREATE INDEX "reactions_interactionTargetId_kind_idx"
  ON "reactions"("interactionTargetId", "kind");
CREATE INDEX "reactions_actorId_createdAt_idx"
  ON "reactions"("actorId", "createdAt");

ALTER TABLE "reactions"
  ADD CONSTRAINT "reactions_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reactions"
  ADD CONSTRAINT "reactions_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reaction_aggregates"
  ADD CONSTRAINT "reaction_aggregates_interactionTargetId_fkey"
  FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_reaction_identity()
RETURNS trigger AS $$
BEGIN
  IF (
    NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."interactionTargetId" IS DISTINCT FROM OLD."interactionTargetId"
    OR NEW."actorId" IS DISTINCT FROM OLD."actorId"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'reaction identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reactions_immutable_identity"
BEFORE UPDATE OF "id", "interactionTargetId", "actorId", "createdAt"
ON "reactions"
FOR EACH ROW EXECUTE FUNCTION enforce_reaction_identity();

/*
 * Votes count opinions, not reputation. Those ledgers do not share a cockpit.
 */
