-- DSS File Passport
-- File: apps/api/prisma/migrations/20261109040000_reputation_qualification_producer/migration.sql
-- Purpose: Adds inactive Reputation producer provenance and bounded Core evidence lookup.
-- Responsibilities: Enforces exact ledger bindings, immutable facts and monotonic current pointers.
-- No historical writes, Outbox FK, consumer activation or accepted migration changes.

-- CreateTable
CREATE TABLE "reputation_qualification_events" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "entryId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "originalEntryId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "provenance" TEXT NOT NULL,
    "contractVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_qualification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_qualification_facts" (
    "id" UUID NOT NULL,
    "eventBindingId" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeEntryId" TEXT,
    "revision" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "qualificationFactId" UUID NOT NULL,
    "contractVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_qualification_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_qualification_states" (
    "originalEntryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "revision" BIGINT,
    "qualificationFactId" UUID,
    "currentFactId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_qualification_states_pkey" PRIMARY KEY ("originalEntryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "reputation_qualification_events_eventId_key" ON "reputation_qualification_events"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_qualification_events_entryId_key" ON "reputation_qualification_events"("entryId");

-- CreateIndex
CREATE INDEX "reputation_qualification_events_originalEntryId_kind_idx" ON "reputation_qualification_events"("originalEntryId", "kind");

-- CreateIndex
CREATE INDEX "reputation_qualification_facts_qualificationFactId_idx" ON "reputation_qualification_facts"("qualificationFactId");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_qualification_revision_key" ON "reputation_qualification_facts"("scopeEntryId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_qualification_scope_key" ON "reputation_qualification_facts"("id", "scopeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_qualification_event_scope_key" ON "reputation_qualification_facts"("eventBindingId", "scope");

-- CreateIndex
CREATE INDEX "outbox_producer_evidence_idx" ON "outbox_events"("producer", "aggregateType", "aggregateId", "eventName", "id");

-- AddForeignKey
ALTER TABLE "reputation_qualification_events" ADD CONSTRAINT "reputation_qualification_events_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "reputation_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_events" ADD CONSTRAINT "reputation_qualification_events_originalEntryId_fkey" FOREIGN KEY ("originalEntryId") REFERENCES "reputation_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_facts" ADD CONSTRAINT "reputation_qualification_facts_eventBindingId_fkey" FOREIGN KEY ("eventBindingId") REFERENCES "reputation_qualification_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_facts" ADD CONSTRAINT "reputation_qualification_facts_scopeEntryId_fkey" FOREIGN KEY ("scopeEntryId") REFERENCES "reputation_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_facts" ADD CONSTRAINT "reputation_qualification_facts_qualificationFactId_fkey" FOREIGN KEY ("qualificationFactId") REFERENCES "reputation_qualification_facts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_states" ADD CONSTRAINT "reputation_qualification_states_originalEntryId_fkey" FOREIGN KEY ("originalEntryId") REFERENCES "reputation_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_states" ADD CONSTRAINT "reputation_qualification_states_qualificationFactId_origin_fkey" FOREIGN KEY ("qualificationFactId", "originalEntryId") REFERENCES "reputation_qualification_facts"("id", "scopeEntryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_qualification_states" ADD CONSTRAINT "reputation_qualification_states_currentFactId_originalEntr_fkey" FOREIGN KEY ("currentFactId", "originalEntryId") REFERENCES "reputation_qualification_facts"("id", "scopeEntryId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE reputation_qualification_events ADD CONSTRAINT reputation_qualification_event_shape CHECK (
  "contractVersion"=1 AND value IN (-1,1) AND
  ((kind='DIRECT' AND "originalEntryId" IS NULL AND provenance IN ('NATIVE','VERIFIED_LEGACY')) OR
   (kind='REVERSAL' AND "originalEntryId" IS NOT NULL AND provenance IN ('NATIVE','BLOCKED_LEGACY')))
);
ALTER TABLE reputation_qualification_facts ADD CONSTRAINT reputation_qualification_fact_shape CHECK (
  "contractVersion"=1 AND
  ((scope='ENTRY' AND "scopeEntryId" IS NOT NULL AND
    ((revision=1 AND action='QUALIFY' AND "qualificationFactId"=id) OR
     (revision=2 AND action='WITHDRAW' AND "qualificationFactId"<>id))) OR
   (scope='EVENT' AND "scopeEntryId" IS NULL AND revision=1 AND action='QUALIFY' AND "qualificationFactId"=id))
);
ALTER TABLE reputation_qualification_states ADD CONSTRAINT reputation_qualification_state_shape CHECK (
  (status='BLOCKED_LEGACY' AND revision IS NULL AND "qualificationFactId" IS NULL AND "currentFactId" IS NULL) OR
  (status='ACTIVE' AND revision IS NOT NULL AND revision=1 AND "qualificationFactId" IS NOT NULL AND "currentFactId" IS NOT NULL AND "currentFactId"="qualificationFactId") OR
  (status='WITHDRAWN' AND revision IS NOT NULL AND revision=2 AND "qualificationFactId" IS NOT NULL AND "currentFactId" IS NOT NULL AND "currentFactId"<>"qualificationFactId")
);

CREATE FUNCTION reputation_qualification_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Reputation qualification history is immutable';
END;
$$;
CREATE TRIGGER reputation_qualification_events_immutable BEFORE UPDATE OR DELETE ON reputation_qualification_events
FOR EACH ROW EXECUTE FUNCTION reputation_qualification_immutable();
CREATE TRIGGER reputation_qualification_facts_immutable BEFORE UPDATE OR DELETE ON reputation_qualification_facts
FOR EACH ROW EXECUTE FUNCTION reputation_qualification_immutable();
CREATE TRIGGER reputation_qualification_states_no_delete BEFORE DELETE ON reputation_qualification_states
FOR EACH ROW EXECUTE FUNCTION reputation_qualification_immutable();

CREATE FUNCTION reputation_qualification_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry reputation_entries%ROWTYPE; original reputation_entries%ROWTYPE;
BEGIN
  SELECT * INTO STRICT entry FROM reputation_entries WHERE id=NEW."entryId";
  IF (NEW."actorId",NEW."recipientId",NEW.value) IS DISTINCT FROM (entry."actorId",entry."recipientId",entry.value) OR
     NEW."originalEntryId" IS DISTINCT FROM entry."reversesEntryId" OR
     (NEW.kind='DIRECT') IS DISTINCT FROM (entry."reversesEntryId" IS NULL) THEN
    RAISE EXCEPTION 'Reputation event does not match its ledger entry';
  END IF;
  IF NEW.kind='REVERSAL' THEN
    SELECT * INTO STRICT original FROM reputation_entries WHERE id=NEW."originalEntryId";
    IF original."reversesEntryId" IS NOT NULL OR original.value<>-NEW.value OR original."recipientId"<>NEW."recipientId" THEN
      RAISE EXCEPTION 'Reputation compensation does not match its original';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reputation_qualification_event_guard BEFORE INSERT ON reputation_qualification_events
FOR EACH ROW EXECUTE FUNCTION reputation_qualification_event_guard();

CREATE FUNCTION reputation_qualification_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE binding reputation_qualification_events%ROWTYPE; qualification reputation_qualification_facts%ROWTYPE;
BEGIN
  SELECT * INTO STRICT binding FROM reputation_qualification_events WHERE id=NEW."eventBindingId";
  IF NEW.scope='EVENT' THEN
    IF binding.kind<>'REVERSAL' THEN RAISE EXCEPTION 'Invalid Reputation event contribution'; END IF;
  ELSIF NEW.action='QUALIFY' THEN
    IF binding.kind<>'DIRECT' OR NEW."scopeEntryId"<>binding."entryId" THEN
      RAISE EXCEPTION 'Invalid Reputation original qualification';
    END IF;
  ELSE
    SELECT * INTO STRICT qualification FROM reputation_qualification_facts WHERE id=NEW."qualificationFactId";
    IF binding.kind<>'REVERSAL' OR binding.provenance<>'NATIVE' OR
       NEW."scopeEntryId" IS DISTINCT FROM binding."originalEntryId" OR
       qualification.scope<>'ENTRY' OR qualification.action<>'QUALIFY' OR qualification.revision<>1 OR
       qualification."scopeEntryId" IS DISTINCT FROM NEW."scopeEntryId" THEN
      RAISE EXCEPTION 'Invalid Reputation withdrawal qualification';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reputation_qualification_fact_guard BEFORE INSERT ON reputation_qualification_facts
FOR EACH ROW EXECUTE FUNCTION reputation_qualification_fact_guard();

CREATE FUNCTION reputation_qualification_state_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE qualification reputation_qualification_facts%ROWTYPE; current_fact reputation_qualification_facts%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW."originalEntryId"<>OLD."originalEntryId" OR NEW."createdAt"<>OLD."createdAt" OR
       OLD.status<>'ACTIVE' OR NEW.status<>'WITHDRAWN' OR
       NEW."qualificationFactId" IS DISTINCT FROM OLD."qualificationFactId" THEN
      RAISE EXCEPTION 'Reputation lifecycle cannot move backwards or rewrite identity';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM reputation_entries WHERE id=NEW."originalEntryId" AND "reversesEntryId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Reputation lifecycle requires an original entry';
  END IF;
  IF NEW.status='BLOCKED_LEGACY' THEN
    IF NOT EXISTS (SELECT 1 FROM reputation_qualification_events WHERE "originalEntryId"=NEW."originalEntryId" AND provenance='BLOCKED_LEGACY') THEN
      RAISE EXCEPTION 'Missing blocked Reputation provenance';
    END IF;
  ELSE
    SELECT * INTO STRICT qualification FROM reputation_qualification_facts WHERE id=NEW."qualificationFactId";
    SELECT * INTO STRICT current_fact FROM reputation_qualification_facts WHERE id=NEW."currentFactId";
    IF qualification.scope<>'ENTRY' OR qualification.action<>'QUALIFY' OR qualification.revision<>1 OR
       current_fact."qualificationFactId"<>qualification.id OR
       (NEW.status='WITHDRAWN' AND (current_fact.action<>'WITHDRAW' OR current_fact.revision<>2)) THEN
      RAISE EXCEPTION 'Unbacked Reputation lifecycle pointer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reputation_qualification_state_guard BEFORE INSERT OR UPDATE ON reputation_qualification_states
FOR EACH ROW EXECUTE FUNCTION reputation_qualification_state_guard();
