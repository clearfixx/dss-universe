-- Where a direct reputation change was made (e.g. a forum post), and one
-- change per member per source. NULL sources (profile/API) stay unconstrained.
ALTER TABLE "reputation_entries" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "reputation_entries" ADD COLUMN "sourceId" TEXT;

ALTER TABLE "reputation_entries"
  ADD CONSTRAINT "reputation_entries_source_pair_check"
  CHECK (("sourceType" IS NULL) = ("sourceId" IS NULL));

CREATE UNIQUE INDEX "reputation_entries_actorId_sourceType_sourceId_key"
  ON "reputation_entries"("actorId", "sourceType", "sourceId");
