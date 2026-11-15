-- DSS File Passport
-- File: apps/api/prisma/migrations/20261108160000_achievement_qualification_owner/migration.sql
-- Purpose: Adds inactive Achievements-owned qualification provenance and bounded progress.
-- Responsibilities: Preserves facts/bindings, scopes revisions and validates cursor shape.
-- No producer journals, activation, historical rewrites or automatic effects are added.

-- CreateTable
CREATE TABLE "achievement_source_cursors" (
    "id" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "appliedRevision" BIGINT NOT NULL DEFAULT 0,
    "targetRevision" BIGINT NOT NULL DEFAULT 0,
    "retiredThrough" BIGINT NOT NULL DEFAULT 0,
    "pendingRetiredThrough" BIGINT NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL DEFAULT 'RETIRING',
    "enrollmentState" TEXT NOT NULL DEFAULT 'PENDING',
    "generation" BIGINT NOT NULL DEFAULT 0,
    "progress" BIGINT NOT NULL DEFAULT 0,
    "inventoryAfterId" TEXT,
    "retirementAfterRevision" BIGINT,
    "retirementAfterAwardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_source_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_source_facts" (
    "id" TEXT NOT NULL,
    "cursorId" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "producerFactId" TEXT NOT NULL,
    "canonicalEventId" TEXT NOT NULL,
    "revision" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "qualificationRevision" BIGINT NOT NULL,
    "qualificationEventId" TEXT NOT NULL,
    "qualificationFactId" TEXT NOT NULL,
    "retiredThroughRevision" BIGINT NOT NULL,
    "predecessorWithdrawalFactId" TEXT,
    "codecVersion" INTEGER NOT NULL DEFAULT 1,
    "factDigest" TEXT NOT NULL,
    "eventProjection" JSONB,
    "eventProjectionDigest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_source_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_award_qualifications" (
    "awardId" TEXT NOT NULL,
    "cursorId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "qualificationRevision" BIGINT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "mappingEvidenceId" TEXT,
    "mappingEvidenceDigest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_award_qualifications_pkey" PRIMARY KEY ("awardId")
);

-- CreateIndex
CREATE UNIQUE INDEX "achievement_source_scope_key" ON "achievement_source_cursors"("producer", "sourceKind", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_source_cursor_producer_key" ON "achievement_source_cursors"("id", "producer");
CREATE INDEX "achievement_source_compatibility_idx" ON "achievement_source_cursors"("sourceKind", "sourceId", "producer");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_source_revision_key" ON "achievement_source_facts"("cursorId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_source_producer_fact_key" ON "achievement_source_facts"("producer", "producerFactId");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_source_fact_binding_key" ON "achievement_source_facts"("cursorId", "id", "revision");
CREATE INDEX "achievement_source_event_idx" ON "achievement_source_facts"("producer", "canonicalEventId", "id");
CREATE INDEX "achievement_source_qualification_event_idx" ON "achievement_source_facts"("producer", "qualificationEventId");

-- A withdrawal can repeat its qualification; a new QUALIFY must use a new identity.
CREATE UNIQUE INDEX "achievement_qualification_identity_key" ON "achievement_source_facts"("cursorId", "qualificationId") WHERE "action" = 'QUALIFY';

-- CreateIndex
CREATE INDEX "achievement_qualification_retirement_idx" ON "achievement_award_qualifications"("cursorId", "qualificationRevision", "awardId");

CREATE INDEX "achievement_source_inventory_idx" ON "achievement_awards"("sourceType", "sourceId", "kind", "id");
CREATE INDEX "achievement_event_inventory_idx" ON "achievement_awards"("sourceEventId", "kind", "id");

-- AddForeignKey
ALTER TABLE "achievement_source_facts" ADD CONSTRAINT "achievement_source_facts_cursorId_producer_fkey" FOREIGN KEY ("cursorId", "producer") REFERENCES "achievement_source_cursors"("id", "producer") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "achievement_award_qualifications" ADD CONSTRAINT "achievement_award_qualifications_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "achievement_awards"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "achievement_award_qualifications" ADD CONSTRAINT "achievement_award_qualifications_cursorId_factId_qualifica_fkey" FOREIGN KEY ("cursorId", "factId", "qualificationRevision") REFERENCES "achievement_source_facts"("cursorId", "id", "revision") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "achievement_source_cursors"
  ADD CONSTRAINT "achievement_cursor_coordinates" CHECK (length("producer") > 0 AND length("sourceKind") > 0 AND length("sourceId") > 0),
  ADD CONSTRAINT "achievement_cursor_counters" CHECK (
    "appliedRevision" >= 0 AND "targetRevision" >= "appliedRevision" AND
    "retiredThrough" >= 0 AND "pendingRetiredThrough" >= "retiredThrough" AND
    "pendingRetiredThrough" <= "targetRevision" AND "generation" >= 0 AND "progress" >= 0
  ),
  ADD CONSTRAINT "achievement_cursor_state" CHECK (
    "phase" IN ('RETIRING', 'STABLE') AND "enrollmentState" IN ('PENDING', 'READY', 'BLOCKED') AND
    ("phase" <> 'STABLE' OR ("enrollmentState" = 'READY' AND "targetRevision" > 0 AND
      "appliedRevision" = "targetRevision" AND "retiredThrough" = "pendingRetiredThrough"))
  ),
  ADD CONSTRAINT "achievement_cursor_frontier" CHECK (
    ("retirementAfterRevision" IS NULL) = ("retirementAfterAwardId" IS NULL) AND
    ("retirementAfterRevision" IS NULL OR ("retirementAfterRevision" > 0 AND
      "retirementAfterRevision" <= "pendingRetiredThrough"))
  );

ALTER TABLE "achievement_source_facts"
  ADD CONSTRAINT "achievement_fact_coordinates" CHECK (
    length("producerFactId") > 0 AND length("canonicalEventId") > 0 AND length("qualificationId") > 0 AND
    length("qualificationEventId") > 0 AND length("qualificationFactId") > 0 AND
    ("predecessorWithdrawalFactId" IS NULL OR length("predecessorWithdrawalFactId") > 0)
  ),
  ADD CONSTRAINT "achievement_fact_revision" CHECK (
    "revision" > 0 AND "qualificationRevision" > 0 AND "qualificationRevision" <= "revision" AND
    "retiredThroughRevision" >= 0 AND "retiredThroughRevision" < "revision" AND "codecVersion" = 1
  ),
  ADD CONSTRAINT "achievement_fact_digest" CHECK ("factDigest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "achievement_fact_projection" CHECK (
    ("eventProjection" IS NULL AND "eventProjectionDigest" IS NULL) OR
    ("eventProjection" IS NOT NULL AND jsonb_typeof("eventProjection") = 'object' AND
      "eventProjectionDigest" IS NOT NULL AND "eventProjectionDigest" ~ '^[0-9a-f]{64}$')
  ),
  ADD CONSTRAINT "achievement_fact_action" CHECK (
    ("action" = 'QUALIFY' AND "qualificationRevision" = "revision" AND
      "qualificationFactId" = "producerFactId" AND "qualificationEventId" = "canonicalEventId" AND
      (("retiredThroughRevision" = 0 AND "predecessorWithdrawalFactId" IS NULL) OR
       ("retiredThroughRevision" > 0 AND "predecessorWithdrawalFactId" IS NOT NULL))) OR
    ("action" = 'WITHDRAW' AND "qualificationRevision" < "revision" AND
      "retiredThroughRevision" >= "qualificationRevision")
  );

ALTER TABLE "achievement_award_qualifications"
  ADD CONSTRAINT "achievement_mapping_evidence" CHECK (
    ("mappingEvidenceId" IS NULL AND "mappingEvidenceDigest" IS NULL) OR
    ("mappingEvidenceId" IS NOT NULL AND length("mappingEvidenceId") > 0 AND
      "mappingEvidenceDigest" IS NOT NULL AND "mappingEvidenceDigest" ~ '^[0-9a-f]{64}$')
  );

CREATE FUNCTION protect_achievement_qualification_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Achievement qualification history is immutable';
END $$;
CREATE TRIGGER achievement_source_fact_history_guard BEFORE UPDATE OR DELETE ON "achievement_source_facts"
FOR EACH ROW EXECUTE FUNCTION protect_achievement_qualification_history();
CREATE TRIGGER achievement_award_qualification_history_guard BEFORE UPDATE OR DELETE ON "achievement_award_qualifications"
FOR EACH ROW EXECUTE FUNCTION protect_achievement_qualification_history();

CREATE FUNCTION protect_achievement_source_cursor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Achievement source history cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW."id", NEW."producer", NEW."sourceKind", NEW."sourceId", NEW."createdAt")
      IS DISTINCT FROM ROW(OLD."id", OLD."producer", OLD."sourceKind", OLD."sourceId", OLD."createdAt") THEN
      RAISE EXCEPTION 'Achievement source identity is immutable';
    END IF;
    IF NEW."appliedRevision" < OLD."appliedRevision" OR NEW."targetRevision" < OLD."targetRevision" OR
      NEW."retiredThrough" < OLD."retiredThrough" OR NEW."pendingRetiredThrough" < OLD."pendingRetiredThrough" OR
      NEW."generation" < OLD."generation" OR NEW."progress" < OLD."progress" THEN
      RAISE EXCEPTION 'Achievement source progress cannot decrease';
    END IF;
    IF NEW."targetRevision" > OLD."targetRevision" AND NEW."generation" <= OLD."generation" THEN
      RAISE EXCEPTION 'Achievement source target needs a new generation';
    END IF;
    IF NEW."generation" = OLD."generation" AND OLD."retirementAfterRevision" IS NOT NULL AND
      (NEW."retirementAfterRevision" IS NULL OR
       (NEW."retirementAfterRevision", NEW."retirementAfterAwardId") <
       (OLD."retirementAfterRevision", OLD."retirementAfterAwardId")) THEN
      RAISE EXCEPTION 'Achievement retirement reset needs a new generation';
    END IF;
    IF NEW."generation" = OLD."generation" AND OLD."inventoryAfterId" IS NOT NULL AND
      (NEW."inventoryAfterId" IS NULL OR NEW."inventoryAfterId" < OLD."inventoryAfterId") THEN
      RAISE EXCEPTION 'Achievement inventory reset needs a new generation';
    END IF;
  END IF;
  IF NEW."targetRevision" > 0 AND NOT EXISTS (
    SELECT 1 FROM "achievement_source_facts" f WHERE f."cursorId" = NEW."id" AND f."revision" = NEW."targetRevision"
  ) THEN RAISE EXCEPTION 'Achievement target requires its immutable fact'; END IF;
  IF NEW."appliedRevision" > 0 AND NOT EXISTS (
    SELECT 1 FROM "achievement_source_facts" f WHERE f."cursorId" = NEW."id" AND f."revision" = NEW."appliedRevision"
  ) THEN RAISE EXCEPTION 'Achievement applied revision requires its immutable fact'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER achievement_source_cursor_guard BEFORE INSERT OR UPDATE OR DELETE ON "achievement_source_cursors"
FOR EACH ROW EXECUTE FUNCTION protect_achievement_source_cursor();

CREATE FUNCTION validate_achievement_award_qualification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE award_kind TEXT; award_event TEXT; fact_action TEXT; fact_event TEXT;
BEGIN
  SELECT a."kind"::text, a."sourceEventId" INTO award_kind, award_event
    FROM "achievement_awards" a WHERE a."id" = NEW."awardId";
  SELECT f."action", f."qualificationEventId" INTO fact_action, fact_event
    FROM "achievement_source_facts" f WHERE f."id" = NEW."factId" AND
      f."cursorId" = NEW."cursorId" AND f."revision" = NEW."qualificationRevision";
  IF award_kind IS DISTINCT FROM 'RULE' OR fact_action IS DISTINCT FROM 'QUALIFY' OR
    award_event IS NULL OR award_event IS DISTINCT FROM NEW."sourceEventId" OR
    fact_event IS DISTINCT FROM NEW."sourceEventId" THEN
    RAISE EXCEPTION 'Achievement binding must match its rule award and qualifying event';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER achievement_award_qualification_binding_guard BEFORE INSERT ON "achievement_award_qualifications"
FOR EACH ROW EXECUTE FUNCTION validate_achievement_award_qualification();
