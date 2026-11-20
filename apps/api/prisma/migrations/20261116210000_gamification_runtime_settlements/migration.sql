-- Forward-only completion of the accepted delivery protocol. No history rewrite.
ALTER TABLE gamification_consumption_receipts DROP CONSTRAINT gamification_receipt_shape;
ALTER TABLE gamification_consumption_receipts ADD CONSTRAINT gamification_receipt_shape CHECK (
  state IN ('READY','RUNNING','RETRY_DUE','COMPLETE','BLOCKED')
  AND epoch>=0 AND "claimSequence">=0 AND "technicalFailures" BETWEEN 0 AND 5
  AND ((state='RUNNING' AND "claimToken" IS NOT NULL AND "claimedAt" IS NOT NULL
    AND "leaseUntil" IS NOT NULL AND "leaseUntil">"claimedAt")
    OR (state<>'RUNNING' AND "claimToken" IS NULL AND "claimedAt" IS NULL AND "leaseUntil" IS NULL))
  AND ((state IN ('READY','RETRY_DUE') AND "availableAt" IS NOT NULL)
    OR (state NOT IN ('READY','RETRY_DUE') AND "availableAt" IS NULL))
  AND ((state='BLOCKED' AND "blockCode" IS NOT NULL AND "blockCode" IN (
    'OWNER_UNAVAILABLE','OWNER_FAILURE','LEASE_EXPIRED','SEAL_READ_FAILURE',
    'ACHIEVEMENTS:INVALID_QUALIFICATION','ACHIEVEMENTS:FACT_CONFLICT',
    'ACHIEVEMENTS:LEGACY_FACT_REQUIRED','ACHIEVEMENTS:BLOCKED_LEGACY_MAPPING',
    'POINTS:INVALID_QUALIFICATION','POINTS:FACT_CONFLICT','POINTS:LEGACY_EVIDENCE_REQUIRED'))
    OR (state<>'BLOCKED' AND "blockCode" IS NULL))
  AND (state<>'COMPLETE' OR ("pointsDone" AND "levelsDone" AND "achievementsDone"))
  AND (state NOT IN ('READY','RUNNING','RETRY_DUE') OR "technicalFailures"<5)
);

ALTER TABLE gamification_consumption_attempts DROP CONSTRAINT gamification_attempt_shape;
ALTER TABLE gamification_consumption_attempts ADD CONSTRAINT gamification_attempt_shape CHECK (
  epoch>=0 AND "claimSequence">0
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
    'ACHIEVEMENTS:LEGACY_FACT_REQUIRED','ACHIEVEMENTS:BLOCKED_LEGACY_MAPPING',
    'POINTS:INVALID_QUALIFICATION','POINTS:FACT_CONFLICT','POINTS:LEGACY_EVIDENCE_REQUIRED')))
);

CREATE OR REPLACE FUNCTION gamification_c21_receipt_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'READY' OR NEW.epoch<>0 OR NEW."claimSequence"<>0 OR NEW."technicalFailures"<>0 THEN
      RAISE EXCEPTION 'gamification receipt must start READY';
    END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW."admissionId",NEW.destination,NEW."createdAt") IS DISTINCT FROM
     ROW(OLD."admissionId",OLD.destination,OLD."createdAt")
    OR (OLD."pointsDone" AND NOT NEW."pointsDone")
    OR (OLD."levelsDone" AND NOT NEW."levelsDone")
    OR (OLD."achievementsDone" AND NOT NEW."achievementsDone") THEN
    RAISE EXCEPTION 'gamification receipt identity and completion cannot regress';
  END IF;
  IF OLD.state='BLOCKED' AND NEW.state='READY' AND NEW.epoch=OLD.epoch+1
    AND NEW."claimSequence"=OLD."claimSequence" AND NEW."technicalFailures"=0
    AND ROW(NEW."pointsDone",NEW."levelsDone",NEW."achievementsDone") IS NOT DISTINCT FROM
        ROW(OLD."pointsDone",OLD."levelsDone",OLD."achievementsDone")
    AND EXISTS (SELECT 1 FROM audit_records a WHERE a.action='gamification.consumption.retried'
      AND a."targetType"='GamificationAdmission' AND a."targetId"=OLD."admissionId"::text
      AND a.metadata->>'previousEpoch'=OLD.epoch::text AND a.metadata->>'nextEpoch'=NEW.epoch::text)
    THEN RETURN NEW; END IF;
  IF NEW.epoch<>OLD.epoch THEN RAISE EXCEPTION 'gamification epoch requires audited blocked retry'; END IF;
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
    OR (NEW."technicalFailures"=OLD."technicalFailures" AND
        (NEW."blockCode" LIKE 'ACHIEVEMENTS:%' OR NEW."blockCode" LIKE 'POINTS:%'))
  ) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'invalid gamification receipt settlement';
END $$;

-- Physical protocol marker checked by the trusted operational activation path.
CREATE FUNCTION gamification_runtime_protocol_version() RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT 1 $$;
