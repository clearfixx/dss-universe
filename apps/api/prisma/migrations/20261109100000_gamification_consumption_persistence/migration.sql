-- DSS File Passport: root-owned inactive admission/consumption persistence.
-- Adds five tables and local transition guards; creates no activation or runner.
-- Canonical byte identity and current-token authority are checked by root adapters.
-- CreateTable
CREATE TABLE "gamification_admissions" (
    "id" UUID NOT NULL,
    "destination" VARCHAR(64) NOT NULL,
    "eventId" UUID NOT NULL,
    "cutoff" TIMESTAMP(3) NOT NULL,
    "descriptorId" VARCHAR(128) NOT NULL,
    "descriptorVersion" INTEGER NOT NULL,
    "codecVersion" INTEGER NOT NULL,
    "projection" JSONB NOT NULL,
    "projectionDigest" BYTEA NOT NULL,
    "encodedBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),

    CONSTRAINT "gamification_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_consumption_receipts" (
    "admissionId" UUID NOT NULL,
    "destination" VARCHAR(64) NOT NULL,
    "state" VARCHAR(16) NOT NULL DEFAULT 'READY',
    "epoch" BIGINT NOT NULL DEFAULT 0,
    "claimSequence" BIGINT NOT NULL DEFAULT 0,
    "technicalFailures" INTEGER NOT NULL DEFAULT 0,
    "claimToken" UUID,
    "claimedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3),
    "blockCode" VARCHAR(64),
    "pointsDone" BOOLEAN NOT NULL,
    "levelsDone" BOOLEAN NOT NULL,
    "achievementsDone" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),

    CONSTRAINT "gamification_consumption_receipts_pkey" PRIMARY KEY ("admissionId")
);

-- CreateTable
CREATE TABLE "gamification_consumption_attempts" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "epoch" BIGINT NOT NULL,
    "claimSequence" BIGINT NOT NULL,
    "claimToken" UUID NOT NULL,
    "state" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "code" VARCHAR(64),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "gamification_consumption_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_owner_progress" (
    "admissionId" UUID NOT NULL,
    "owner" VARCHAR(16) NOT NULL,
    "codecVersion" INTEGER NOT NULL,
    "coordinates" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),

    CONSTRAINT "gamification_owner_progress_pkey" PRIMARY KEY ("admissionId","owner")
);

-- CreateTable
CREATE TABLE "gamification_admission_rejections" (
    "id" UUID NOT NULL,
    "destination" VARCHAR(64) NOT NULL,
    "eventId" UUID NOT NULL,
    "claimToken" UUID NOT NULL,
    "cycle" INTEGER NOT NULL,
    "cycleAttempt" INTEGER NOT NULL,
    "descriptorId" VARCHAR(128),
    "descriptorVersion" INTEGER,
    "code" VARCHAR(64) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),

    CONSTRAINT "gamification_admission_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_admission_event_key" ON "gamification_admissions"("destination", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_admission_destination_key" ON "gamification_admissions"("id", "destination");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_consumption_receipts_claimToken_key" ON "gamification_consumption_receipts"("claimToken");

-- CreateIndex
CREATE INDEX "gamification_consumption_due_idx" ON "gamification_consumption_receipts"("destination", "state", "availableAt", "admissionId");

-- CreateIndex
CREATE INDEX "gamification_consumption_lease_idx" ON "gamification_consumption_receipts"("destination", "state", "leaseUntil", "admissionId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_receipt_destination_key" ON "gamification_consumption_receipts"("admissionId", "destination");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_consumption_attempts_claimToken_key" ON "gamification_consumption_attempts"("claimToken");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_consumption_attempt_key" ON "gamification_consumption_attempts"("admissionId", "epoch", "claimSequence");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_admission_rejections_claimToken_key" ON "gamification_admission_rejections"("claimToken");

-- CreateIndex
CREATE INDEX "gamification_admission_rejection_time_idx" ON "gamification_admission_rejections"("destination", "observedAt", "id");

-- AddForeignKey
ALTER TABLE "gamification_admissions" ADD CONSTRAINT "gamification_admissions_destination_eventId_fkey" FOREIGN KEY ("destination", "eventId") REFERENCES "gamification_deliveries"("destination", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gamification_consumption_receipts" ADD CONSTRAINT "gamification_consumption_receipts_admissionId_destination_fkey" FOREIGN KEY ("admissionId", "destination") REFERENCES "gamification_admissions"("id", "destination") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gamification_consumption_attempts" ADD CONSTRAINT "gamification_consumption_attempts_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "gamification_admissions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gamification_owner_progress" ADD CONSTRAINT "gamification_owner_progress_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "gamification_admissions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "gamification_admission_rejections" ADD CONSTRAINT "gamification_admission_rejections_destination_eventId_fkey" FOREIGN KEY ("destination", "eventId") REFERENCES "gamification_deliveries"("destination", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE gamification_admissions ADD CONSTRAINT gamification_admission_shape CHECK (
  "descriptorId" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  AND "descriptorVersion">0 AND "codecVersion"=1
  AND jsonb_typeof(projection)='object'
  AND octet_length("projectionDigest")=32
  AND "encodedBytes" BETWEEN 1 AND 262144
  -- JSONB formatting is not the canonical encoding. This is a separate storage guard.
  AND octet_length(projection::text)<=524288
);

ALTER TABLE gamification_consumption_receipts ADD CONSTRAINT gamification_receipt_shape CHECK (
  state IN ('READY','RUNNING','RETRY_DUE','COMPLETE','BLOCKED')
  AND epoch=0 AND "claimSequence">=0 AND "technicalFailures" BETWEEN 0 AND 5
  AND ((state='RUNNING' AND "claimToken" IS NOT NULL AND "claimedAt" IS NOT NULL
    AND "leaseUntil" IS NOT NULL AND "leaseUntil">"claimedAt")
    OR (state<>'RUNNING' AND "claimToken" IS NULL AND "claimedAt" IS NULL AND "leaseUntil" IS NULL))
  AND ((state IN ('READY','RETRY_DUE') AND "availableAt" IS NOT NULL)
    OR (state NOT IN ('READY','RETRY_DUE') AND "availableAt" IS NULL))
  AND ((state='BLOCKED' AND "blockCode" IS NOT NULL AND "blockCode" IN (
    'OWNER_UNAVAILABLE','OWNER_FAILURE','LEASE_EXPIRED','SEAL_READ_FAILURE',
    'ACHIEVEMENTS:INVALID_QUALIFICATION','ACHIEVEMENTS:FACT_CONFLICT',
    'ACHIEVEMENTS:LEGACY_FACT_REQUIRED','ACHIEVEMENTS:BLOCKED_LEGACY_MAPPING'))
    OR (state<>'BLOCKED' AND "blockCode" IS NULL))
  AND (state<>'COMPLETE' OR ("pointsDone" AND "levelsDone" AND "achievementsDone"))
  AND (state NOT IN ('READY','RUNNING','RETRY_DUE') OR "technicalFailures"<5)
);

ALTER TABLE gamification_consumption_attempts ADD CONSTRAINT gamification_attempt_shape CHECK (
  epoch=0 AND "claimSequence">0
  AND state IN ('OPEN','COMPLETE','CONTINUED','FAILED','EXPIRED','BLOCKED','FENCED')
  AND ((state='OPEN' AND "finishedAt" IS NULL AND code IS NULL)
    OR (state<>'OPEN' AND "finishedAt" IS NOT NULL AND "finishedAt">="startedAt"))
  AND (state NOT IN ('COMPLETE','CONTINUED','FENCED') OR code IS NULL)
  AND (state<>'EXPIRED' OR (code IS NOT NULL AND code='LEASE_EXPIRED'))
  AND (state<>'FAILED' OR (code IS NOT NULL AND code IN (
    'OWNER_UNAVAILABLE','OWNER_FAILURE','LEASE_EXPIRED','SEAL_READ_FAILURE')))
  AND (state<>'BLOCKED' OR (code IS NOT NULL AND code IN (
    'OWNER_UNAVAILABLE','OWNER_FAILURE','LEASE_EXPIRED','SEAL_READ_FAILURE',
    'ACHIEVEMENTS:INVALID_QUALIFICATION','ACHIEVEMENTS:FACT_CONFLICT',
    'ACHIEVEMENTS:LEGACY_FACT_REQUIRED','ACHIEVEMENTS:BLOCKED_LEGACY_MAPPING')))
);

ALTER TABLE gamification_owner_progress ADD CONSTRAINT gamification_progress_shape CHECK (
  owner='ACHIEVEMENTS' AND "codecVersion"=1 AND jsonb_typeof(coordinates)='object'
  AND octet_length(coordinates::text)<=262144
);

ALTER TABLE gamification_admission_rejections ADD CONSTRAINT gamification_rejection_shape CHECK (
  cycle>=0 AND "cycleAttempt" BETWEEN 1 AND 5
  AND (("descriptorId" IS NULL AND "descriptorVersion" IS NULL)
    OR ("descriptorId" IS NOT NULL AND "descriptorVersion" IS NOT NULL
      AND "descriptorVersion">0 AND "descriptorId" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'))
  AND code IN ('UNSUPPORTED_DESCRIPTOR','UNSUPPORTED_EVENT_VERSION','CONFIGURATION_REQUIRED',
    'CANONICAL_EVIDENCE_MISSING','CANONICAL_EVIDENCE_MISMATCH','PRODUCER_EVIDENCE_MISSING',
    'LEGACY_PROVENANCE_REQUIRED','BLOCKED_LEGACY_MAPPING','INVALID_QUALIFIED_PROJECTION',
    'PROJECTION_TOO_LARGE','SEALED_IDENTITY_CONFLICT')
);

CREATE FUNCTION gamification_c21_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'gamification C2.1 history is immutable';
END $$;

CREATE TRIGGER gamification_admission_immutable BEFORE UPDATE OR DELETE ON gamification_admissions
FOR EACH ROW EXECUTE FUNCTION gamification_c21_reject_mutation();
CREATE TRIGGER gamification_rejection_immutable BEFORE UPDATE OR DELETE ON gamification_admission_rejections
FOR EACH ROW EXECUTE FUNCTION gamification_c21_reject_mutation();
CREATE TRIGGER gamification_receipt_no_delete BEFORE DELETE ON gamification_consumption_receipts
FOR EACH ROW EXECUTE FUNCTION gamification_c21_reject_mutation();
CREATE TRIGGER gamification_attempt_no_delete BEFORE DELETE ON gamification_consumption_attempts
FOR EACH ROW EXECUTE FUNCTION gamification_c21_reject_mutation();
CREATE TRIGGER gamification_progress_no_delete BEFORE DELETE ON gamification_owner_progress
FOR EACH ROW EXECUTE FUNCTION gamification_c21_reject_mutation();

CREATE FUNCTION gamification_c21_receipt_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'READY' OR NEW.epoch<>0 OR NEW."claimSequence"<>0 OR NEW."technicalFailures"<>0 THEN
      RAISE EXCEPTION 'gamification receipt must start READY';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW."admissionId",NEW.destination,NEW.epoch,NEW."createdAt") IS DISTINCT FROM
     ROW(OLD."admissionId",OLD.destination,OLD.epoch,OLD."createdAt")
    OR (OLD."pointsDone" AND NOT NEW."pointsDone")
    OR (OLD."levelsDone" AND NOT NEW."levelsDone")
    OR (OLD."achievementsDone" AND NOT NEW."achievementsDone") THEN
    RAISE EXCEPTION 'gamification receipt identity and completion cannot regress';
  END IF;
  IF OLD.state IN ('READY','RETRY_DUE') AND NEW.state='RUNNING'
    AND NEW."claimSequence"=OLD."claimSequence"+1
    AND NEW."technicalFailures"=OLD."technicalFailures"
    AND ROW(NEW."pointsDone",NEW."levelsDone",NEW."achievementsDone") IS NOT DISTINCT FROM
        ROW(OLD."pointsDone",OLD."levelsDone",OLD."achievementsDone") THEN RETURN NEW; END IF;
  IF OLD.state<>'RUNNING' OR NEW."claimSequence"<>OLD."claimSequence" THEN
    RAISE EXCEPTION 'invalid gamification receipt transition';
  END IF;
  IF NEW.state='RUNNING' AND NEW."technicalFailures"=OLD."technicalFailures"
    AND ROW(NEW."claimToken",NEW."claimedAt",NEW."leaseUntil") IS NOT DISTINCT FROM
        ROW(OLD."claimToken",OLD."claimedAt",OLD."leaseUntil")
    AND ROW(NEW."pointsDone",NEW."levelsDone",NEW."achievementsDone") IS DISTINCT FROM
        ROW(OLD."pointsDone",OLD."levelsDone",OLD."achievementsDone") THEN RETURN NEW; END IF;
  IF NEW.state='COMPLETE' AND NEW."technicalFailures"=OLD."technicalFailures" THEN RETURN NEW; END IF;
  IF ROW(NEW."pointsDone",NEW."levelsDone",NEW."achievementsDone") IS DISTINCT FROM
      ROW(OLD."pointsDone",OLD."levelsDone",OLD."achievementsDone") THEN
    RAISE EXCEPTION 'gamification settlement cannot change owner completion';
  END IF;
  IF NEW.state='READY' AND NEW."technicalFailures"=OLD."technicalFailures" THEN RETURN NEW; END IF;
  IF NEW.state='RETRY_DUE' AND NEW."technicalFailures"=OLD."technicalFailures"+1 THEN RETURN NEW; END IF;
  IF NEW.state='BLOCKED' AND (
    (NEW."technicalFailures"=5 AND OLD."technicalFailures"=4
      AND NEW."blockCode" IN ('OWNER_UNAVAILABLE','OWNER_FAILURE','LEASE_EXPIRED','SEAL_READ_FAILURE'))
    OR (NEW."technicalFailures"=OLD."technicalFailures" AND NEW."blockCode" LIKE 'ACHIEVEMENTS:%')
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid gamification receipt settlement';
END $$;
CREATE TRIGGER gamification_receipt_transition BEFORE INSERT OR UPDATE ON gamification_consumption_receipts
FOR EACH ROW EXECUTE FUNCTION gamification_c21_receipt_transition();

CREATE FUNCTION gamification_c21_attempt_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'OPEN' THEN RAISE EXCEPTION 'gamification attempt must start OPEN'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.state<>'OPEN' OR NEW.state='OPEN'
    OR ROW(NEW.id,NEW."admissionId",NEW.epoch,NEW."claimSequence",NEW."claimToken",NEW."startedAt") IS DISTINCT FROM
       ROW(OLD.id,OLD."admissionId",OLD.epoch,OLD."claimSequence",OLD."claimToken",OLD."startedAt") THEN
    RAISE EXCEPTION 'gamification attempt history is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gamification_attempt_transition BEFORE INSERT OR UPDATE ON gamification_consumption_attempts
FOR EACH ROW EXECUTE FUNCTION gamification_c21_attempt_transition();

CREATE FUNCTION gamification_c21_progress_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."admissionId",NEW.owner,NEW."codecVersion") IS DISTINCT FROM
     ROW(OLD."admissionId",OLD.owner,OLD."codecVersion") THEN
    RAISE EXCEPTION 'gamification progress identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gamification_progress_transition BEFORE UPDATE ON gamification_owner_progress
FOR EACH ROW EXECUTE FUNCTION gamification_c21_progress_transition();
