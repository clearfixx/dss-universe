-- CreateTable
CREATE TABLE "community_point_source_cursors" (
    "id" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "retiredThroughRevision" BIGINT NOT NULL DEFAULT 0,
    "activeQualificationId" TEXT,
    "activeQualificationRevision" BIGINT NOT NULL DEFAULT 0,
    "activeEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_source_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_point_source_facts" (
    "producer" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "cursorId" TEXT NOT NULL,
    "canonicalEventId" TEXT NOT NULL,
    "revision" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "qualificationRevision" BIGINT NOT NULL,
    "qualificationEventId" TEXT NOT NULL,
    "qualificationFactId" TEXT NOT NULL,
    "retiredThroughRevision" BIGINT NOT NULL,
    "predecessorWithdrawalFactId" TEXT,
    "contractVersion" INTEGER NOT NULL,
    "factDigest" TEXT NOT NULL,
    "qualificationProjection" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_source_facts_pkey" PRIMARY KEY ("producer","factId")
);

-- CreateTable
CREATE TABLE "community_point_qualifications" (
    "entryId" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "qualificationFactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_qualifications_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "community_point_facet_receipts" (
    "eventId" TEXT NOT NULL,
    "facet" TEXT NOT NULL,
    "contractVersion" INTEGER NOT NULL,
    "commandDigest" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "ruleKey" TEXT,
    "contributionEntryId" TEXT,
    "sourceFactProducer" TEXT,
    "sourceFactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_facet_receipts_pkey" PRIMARY KEY ("eventId","facet")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_point_source_cursors_activeEntryId_key" ON "community_point_source_cursors"("activeEntryId");

-- CreateIndex
CREATE INDEX "community_point_source_cursors_sourceKind_sourceId_idx" ON "community_point_source_cursors"("sourceKind", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "community_point_source_cursors_producer_sourceKind_sourceId_key" ON "community_point_source_cursors"("producer", "sourceKind", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "community_point_source_facts_cursorId_revision_key" ON "community_point_source_facts"("cursorId", "revision");

CREATE INDEX "community_point_source_fact_canonical_idx" ON "community_point_source_facts"("cursorId", "canonicalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "community_point_qualifications_producer_qualificationFactId_key" ON "community_point_qualifications"("producer", "qualificationFactId");

-- CreateIndex
CREATE UNIQUE INDEX "community_point_facet_receipts_contributionEntryId_key" ON "community_point_facet_receipts"("contributionEntryId");

-- AddForeignKey
ALTER TABLE "community_point_source_cursors" ADD CONSTRAINT "community_point_source_cursors_activeEntryId_fkey" FOREIGN KEY ("activeEntryId") REFERENCES "community_point_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_point_source_facts" ADD CONSTRAINT "community_point_source_facts_cursorId_fkey" FOREIGN KEY ("cursorId") REFERENCES "community_point_source_cursors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_point_qualifications" ADD CONSTRAINT "community_point_qualifications_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "community_point_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_point_qualifications" ADD CONSTRAINT "community_point_qualifications_producer_qualificationFactI_fkey" FOREIGN KEY ("producer", "qualificationFactId") REFERENCES "community_point_source_facts"("producer", "factId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_point_facet_receipts" ADD CONSTRAINT "community_point_facet_receipts_contributionEntryId_fkey" FOREIGN KEY ("contributionEntryId") REFERENCES "community_point_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_point_facet_receipts" ADD CONSTRAINT "community_point_facet_receipts_sourceFactProducer_sourceFa_fkey" FOREIGN KEY ("sourceFactProducer", "sourceFactId") REFERENCES "community_point_source_facts"("producer", "factId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Owner-local history is append-only; cursors may advance, never erase evidence.
ALTER TABLE "community_point_source_cursors" ADD CONSTRAINT "point_cursor_frontier_check" CHECK (
  "retiredThroughRevision" >= 0 AND "activeQualificationRevision" >= 0
  AND (("activeQualificationId" IS NULL) = ("activeQualificationRevision" = 0))
  AND ("activeEntryId" IS NULL OR "activeQualificationRevision" > "retiredThroughRevision")
);
ALTER TABLE "community_point_source_facts" ADD CONSTRAINT "point_fact_shape_check" CHECK (
  "contractVersion" = 1 AND "factDigest" ~ '^[0-9a-f]{64}$'
  AND "revision" > 0 AND "qualificationRevision" > 0
  AND "retiredThroughRevision" >= 0 AND "retiredThroughRevision" <= "revision"
  AND jsonb_typeof("qualificationProjection") = 'object'
  AND "qualificationProjection" ?& ARRAY['eventName','eventVersion','sourceType','sourceId','actorId','occurredAt','value','recipientId']
  AND ("qualificationProjection" - ARRAY['eventName','eventVersion','sourceType','sourceId','actorId','occurredAt','value','recipientId']) = '{}'::jsonb
  AND (("action" = 'QUALIFY' AND "revision" = "qualificationRevision"
        AND "factId" = "qualificationFactId" AND "canonicalEventId" = "qualificationEventId"
        AND "retiredThroughRevision" < "qualificationRevision")
    OR ("action" = 'WITHDRAW' AND "revision" > "qualificationRevision"
        AND "retiredThroughRevision" >= "qualificationRevision"))
);
ALTER TABLE "community_point_facet_receipts" ADD CONSTRAINT "point_receipt_shape_check" CHECK (
  "contractVersion" = 1 AND "commandDigest" ~ '^[0-9a-f]{64}$'
  AND (("sourceFactProducer" IS NULL) = ("sourceFactId" IS NULL))
  AND (("facet" = 'CONTROL' AND "disposition" IN ('APPLIED','NO_SOURCE_EFFECT')
        AND "ruleKey" IS NULL AND "contributionEntryId" IS NULL
        AND ("disposition" <> 'APPLIED' OR "sourceFactId" IS NOT NULL))
    OR ("facet" = 'CONTRIBUTION' AND "sourceFactId" IS NULL
        AND (("disposition" = 'NO_MATCH' AND "ruleKey" IS NULL AND "contributionEntryId" IS NULL)
          OR ("disposition" IN ('CAPPED','SOURCE_REVOKED') AND "ruleKey" IS NOT NULL AND "contributionEntryId" IS NULL)
          OR ("disposition" = 'APPLIED' AND "ruleKey" IS NOT NULL AND "contributionEntryId" IS NOT NULL))))
);

CREATE FUNCTION reject_qualified_point_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  RAISE EXCEPTION 'Qualified Points history is immutable';
END $body$;
CREATE TRIGGER point_fact_immutable BEFORE UPDATE OR DELETE ON "community_point_source_facts"
FOR EACH ROW EXECUTE FUNCTION reject_qualified_point_history_mutation();
CREATE TRIGGER point_qualification_immutable BEFORE UPDATE OR DELETE ON "community_point_qualifications"
FOR EACH ROW EXECUTE FUNCTION reject_qualified_point_history_mutation();
CREATE TRIGGER point_receipt_immutable BEFORE UPDATE OR DELETE ON "community_point_facet_receipts"
FOR EACH ROW EXECUTE FUNCTION reject_qualified_point_history_mutation();

CREATE FUNCTION guard_point_cursor_advance() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Point source cursor cannot be deleted'; END IF;
  IF NEW."id" <> OLD."id" OR NEW."producer" <> OLD."producer"
    OR NEW."sourceKind" <> OLD."sourceKind" OR NEW."sourceId" <> OLD."sourceId"
    OR NEW."createdAt" <> OLD."createdAt"
    OR NEW."retiredThroughRevision" < OLD."retiredThroughRevision"
    OR NEW."activeQualificationRevision" < OLD."activeQualificationRevision" THEN
    RAISE EXCEPTION 'Point source identity and progress cannot regress';
  END IF;
  RETURN NEW;
END $body$;
CREATE TRIGGER point_cursor_advance BEFORE UPDATE OR DELETE ON "community_point_source_cursors"
FOR EACH ROW EXECUTE FUNCTION guard_point_cursor_advance();

-- Deferred checks see the complete atomic facet, including its final receipt.
CREATE FUNCTION validate_qualified_point_evidence() RETURNS trigger LANGUAGE plpgsql AS $body$
DECLARE fact_data RECORD; entry_data RECORD; cursor_data RECORD; rule_data RECORD; q JSONB;
BEGIN
  IF TG_TABLE_NAME = 'community_point_source_facts' THEN
    SELECT * INTO cursor_data FROM "community_point_source_cursors" WHERE "id" = NEW."cursorId";
    IF cursor_data."producer" <> NEW."producer" THEN RAISE EXCEPTION 'Point fact scope mismatch'; END IF;
    IF (cursor_data."sourceKind" = '@event' AND cursor_data."sourceId" <> NEW."qualificationEventId")
      OR (cursor_data."sourceKind" <> '@event' AND (cursor_data."sourceKind" IS DISTINCT FROM NEW."qualificationProjection"->>'sourceType' OR cursor_data."sourceId" IS DISTINCT FROM NEW."qualificationProjection"->>'sourceId')) THEN
      RAISE EXCEPTION 'Point fact source must match its qualification projection';
    END IF;
    IF NEW."action" = 'WITHDRAW' THEN
      SELECT * INTO fact_data FROM "community_point_source_facts" WHERE "producer" = NEW."producer" AND "factId" = NEW."qualificationFactId";
      IF NOT FOUND OR fact_data."action" <> 'QUALIFY' OR fact_data."cursorId" <> NEW."cursorId"
        OR fact_data."qualificationId" <> NEW."qualificationId" OR fact_data."revision" <> NEW."qualificationRevision"
        OR fact_data."canonicalEventId" <> NEW."qualificationEventId"
        OR fact_data."qualificationProjection" <> NEW."qualificationProjection" THEN
        RAISE EXCEPTION 'Point withdrawal requires its exact qualification';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'community_point_qualifications' THEN
    SELECT * INTO fact_data FROM "community_point_source_facts" WHERE "producer" = NEW."producer" AND "factId" = NEW."qualificationFactId";
    SELECT * INTO entry_data FROM "community_point_entries" WHERE "id" = NEW."entryId";
    q := fact_data."qualificationProjection";
    SELECT * INTO rule_data FROM "community_point_rules" WHERE "key" = entry_data."ruleKey";
    IF fact_data."action" <> 'QUALIFY' OR entry_data."reversesEntryId" IS NOT NULL
      OR entry_data."sourceEventId" IS DISTINCT FROM fact_data."qualificationEventId"
      OR entry_data."sourceEventName" IS DISTINCT FROM q->>'eventName'
      OR entry_data."userId" IS DISTINCT FROM q->>'recipientId'
      OR entry_data."sourceType" IS DISTINCT FROM q->>'sourceType' OR entry_data."sourceId" IS DISTINCT FROM q->>'sourceId'
      OR entry_data."actorId" IS DISTINCT FROM q->>'actorId'
      OR entry_data."occurredAt" IS DISTINCT FROM ((q->>'occurredAt')::timestamptz AT TIME ZONE 'UTC')
      OR rule_data."eventName" IS DISTINCT FROM q->>'eventName'
      OR (rule_data."payloadValue" IS NOT NULL AND rule_data."payloadValue" IS DISTINCT FROM (q->>'value')::integer) THEN
      RAISE EXCEPTION 'Point binding must match its owned qualification evidence';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "community_point_facet_receipts" WHERE "eventId" = entry_data."sourceEventId" AND "facet" = 'CONTRIBUTION' AND "contributionEntryId" = entry_data."id")
      AND NOT EXISTS (SELECT 1 FROM "processed_events" WHERE "eventId" = entry_data."sourceEventId" AND "consumerName" = 'dss.api.community-points'
        AND "eventName" = q->>'eventName' AND "eventVersion" = (q->>'eventVersion')::integer) THEN
      RAISE EXCEPTION 'Point binding requires a facet receipt or exact legacy marker';
    END IF;
  ELSIF TG_TABLE_NAME = 'community_point_source_cursors' THEN
    IF NEW."retiredThroughRevision" > 0 AND NOT EXISTS (SELECT 1 FROM "community_point_source_facts" WHERE "cursorId" = NEW."id" AND "retiredThroughRevision" >= NEW."retiredThroughRevision") THEN
      RAISE EXCEPTION 'Point retirement requires owned producer evidence';
    END IF;
    IF NEW."activeQualificationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "community_point_source_facts" WHERE "cursorId" = NEW."id" AND "action" = 'QUALIFY' AND "qualificationId" = NEW."activeQualificationId" AND "qualificationRevision" = NEW."activeQualificationRevision") THEN
      RAISE EXCEPTION 'Point cursor requires its exact qualification';
    END IF;
    IF NEW."activeEntryId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "community_point_qualifications" b JOIN "community_point_source_facts" f ON f."producer" = b."producer" AND f."factId" = b."qualificationFactId"
      WHERE b."entryId" = NEW."activeEntryId" AND f."cursorId" = NEW."id" AND f."qualificationId" = NEW."activeQualificationId" AND f."qualificationRevision" = NEW."activeQualificationRevision"
    ) THEN RAISE EXCEPTION 'Point cursor cannot point to a different qualification'; END IF;
  ELSIF TG_TABLE_NAME = 'community_point_facet_receipts' THEN
    IF NEW."contributionEntryId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM "community_point_entries" e JOIN "community_point_qualifications" b ON b."entryId" = e."id"
      WHERE e."id" = NEW."contributionEntryId" AND e."sourceEventId" = NEW."eventId" AND e."userId" = NEW."recipientId" AND e."ruleKey" = NEW."ruleKey"
    ) THEN RAISE EXCEPTION 'Point receipt cannot claim another contribution'; END IF;
    IF NEW."sourceFactId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "community_point_source_facts" WHERE "producer" = NEW."sourceFactProducer" AND "factId" = NEW."sourceFactId" AND "action" = 'WITHDRAW') THEN
      RAISE EXCEPTION 'Point control receipt requires a withdrawal fact';
    END IF;
  END IF;
  RETURN NEW;
END $body$;

CREATE CONSTRAINT TRIGGER point_fact_evidence AFTER INSERT ON "community_point_source_facts"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_qualified_point_evidence();
CREATE CONSTRAINT TRIGGER point_qualification_evidence AFTER INSERT ON "community_point_qualifications"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_qualified_point_evidence();
CREATE CONSTRAINT TRIGGER point_cursor_evidence AFTER INSERT OR UPDATE ON "community_point_source_cursors"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_qualified_point_evidence();
CREATE CONSTRAINT TRIGGER point_receipt_evidence AFTER INSERT ON "community_point_facet_receipts"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_qualified_point_evidence();
