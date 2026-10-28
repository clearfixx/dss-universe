-- DSS File Passport
-- File: apps/api/prisma/migrations/20261028120000_gamification_routing_persistence/migration.sql
-- Purpose: Adds destination-owned routing state and history guards without activation.
-- No source envelopes, balances, markers, old migrations or queue settings are rewritten.

CREATE TYPE "GamificationActivationState" AS ENUM ('PREPARED', 'ACTIVE', 'PAUSED');
CREATE TYPE "GamificationPublicationState" AS ENUM ('WAITING', 'CLAIMED', 'QUEUED', 'BLOCKED');
CREATE TYPE "GamificationPublicationFailureCode" AS ENUM ('QUEUE_ADD_FAILED', 'CLAIM_EXPIRED');

CREATE TABLE "gamification_activations" (
  "destination" VARCHAR(64) NOT NULL PRIMARY KEY,
  "state" "GamificationActivationState" NOT NULL DEFAULT 'PREPARED',
  "cutoff" TIMESTAMP(3), "activatedBy" VARCHAR(200), "changedBy" VARCHAR(200) NOT NULL,
  "revision" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  CONSTRAINT "gamification_destination_fixed" CHECK ("destination" = 'gamification.v1'),
  CONSTRAINT "gamification_activation_revision" CHECK ("revision" >= 0),
  CONSTRAINT "gamification_activation_actor" CHECK (length(trim("changedBy")) > 0),
  CONSTRAINT "gamification_activation_boundary" CHECK (
    ("state" = 'PREPARED' AND "cutoff" IS NULL AND "activatedBy" IS NULL) OR
    ("state" IN ('ACTIVE','PAUSED') AND "cutoff" IS NOT NULL AND "activatedBy" IS NOT NULL AND length(trim("activatedBy")) > 0)
  )
);
CREATE TABLE "gamification_discovery" (
  "destination" VARCHAR(64) NOT NULL PRIMARY KEY,
  "forwardAt" TIMESTAMP(3), "forwardId" UUID,
  "sweepAt" TIMESTAMP(3), "sweepId" UUID,
  "upperAt" TIMESTAMP(3), "upperId" UUID,
  "epochOpen" BOOLEAN NOT NULL DEFAULT false,
  "epoch" BIGINT NOT NULL DEFAULT 0, "examined" BIGINT NOT NULL DEFAULT 0,
  "epochStartedAt" TIMESTAMP(3), "lastProgressAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  CONSTRAINT "gamification_discovery_destination_fkey" FOREIGN KEY ("destination") REFERENCES "gamification_activations"("destination") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "gamification_discovery_counters" CHECK ("epoch" >= 0 AND "examined" >= 0),
  CONSTRAINT "gamification_forward_pair" CHECK (("forwardAt" IS NULL) = ("forwardId" IS NULL)),
  CONSTRAINT "gamification_sweep_pair" CHECK (("sweepAt" IS NULL) = ("sweepId" IS NULL)),
  CONSTRAINT "gamification_upper_pair" CHECK (("upperAt" IS NULL) = ("upperId" IS NULL)),
  CONSTRAINT "gamification_epoch_window" CHECK (
    (NOT "epochOpen" AND "sweepAt" IS NULL AND "upperAt" IS NULL AND "epochStartedAt" IS NULL) OR
    ("epochOpen" AND "upperAt" IS NOT NULL AND "epochStartedAt" IS NOT NULL AND
      ("sweepAt" IS NULL OR ("sweepAt", "sweepId") <= ("upperAt", "upperId")))
  )
);
CREATE TABLE "gamification_deliveries" (
  "destination" VARCHAR(64) NOT NULL, "eventId" UUID NOT NULL,
  "state" "GamificationPublicationState" NOT NULL DEFAULT 'WAITING',
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  "claimToken" UUID, "claimedAt" TIMESTAMP(3), "leaseUntil" TIMESTAMP(3),
  "claimCount" BIGINT NOT NULL DEFAULT 0, "cycle" INTEGER NOT NULL DEFAULT 0,
  "cycleAttempts" INTEGER NOT NULL DEFAULT 0, "queuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  CONSTRAINT "gamification_deliveries_pkey" PRIMARY KEY ("destination", "eventId"),
  CONSTRAINT "gamification_deliveries_destination_fkey" FOREIGN KEY ("destination") REFERENCES "gamification_activations"("destination") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "gamification_deliveries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "outbox_events"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "gamification_delivery_counters" CHECK ("claimCount" >= 0 AND "cycle" >= 0 AND "cycleAttempts" BETWEEN 0 AND 5 AND "claimCount" >= "cycleAttempts"),
  CONSTRAINT "gamification_delivery_claim" CHECK (
    ("state" = 'CLAIMED' AND "claimToken" IS NOT NULL AND "claimedAt" IS NOT NULL AND "leaseUntil" IS NOT NULL AND "leaseUntil" > "claimedAt" AND "cycleAttempts" > 0) OR
    ("state" <> 'CLAIMED' AND "claimToken" IS NULL AND "claimedAt" IS NULL AND "leaseUntil" IS NULL)
  ),
  CONSTRAINT "gamification_delivery_ack" CHECK (("state" = 'QUEUED') = ("queuedAt" IS NOT NULL)),
  CONSTRAINT "gamification_delivery_budget" CHECK (("state" <> 'WAITING' OR "cycleAttempts" < 5) AND ("state" <> 'BLOCKED' OR "cycleAttempts" = 5))
);
CREATE TABLE "gamification_publication_failures" (
  "id" UUID NOT NULL PRIMARY KEY, "destination" VARCHAR(64) NOT NULL, "eventId" UUID NOT NULL,
  "claimToken" UUID NOT NULL, "cycle" INTEGER NOT NULL, "cycleAttempt" INTEGER NOT NULL,
  "code" "GamificationPublicationFailureCode" NOT NULL,
  "failedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC'::text, clock_timestamp()),
  CONSTRAINT "gamification_publication_failures_destination_eventId_fkey" FOREIGN KEY ("destination", "eventId") REFERENCES "gamification_deliveries"("destination", "eventId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "gamification_failure_attempt" CHECK ("cycle" >= 0 AND "cycleAttempt" BETWEEN 1 AND 5)
);
CREATE INDEX "outbox_routing_coordinate_idx" ON "outbox_events"("createdAt", "id");
CREATE INDEX "gamification_delivery_due_idx" ON "gamification_deliveries"("destination", "state", "availableAt", "eventId");
CREATE INDEX "gamification_delivery_lease_idx" ON "gamification_deliveries"("destination", "state", "leaseUntil", "eventId");
CREATE UNIQUE INDEX "gamification_publication_failures_claimToken_key" ON "gamification_publication_failures"("claimToken");
CREATE INDEX "gamification_publication_failure_time_idx" ON "gamification_publication_failures"("destination", "failedAt", "id");

CREATE FUNCTION protect_gamification_activation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Gamification activation cannot be deleted'; END IF;
  IF ROW(NEW."destination", NEW."createdAt") IS DISTINCT FROM ROW(OLD."destination", OLD."createdAt") THEN
    RAISE EXCEPTION 'Gamification activation identity is immutable';
  END IF;
  IF OLD."state" <> 'PREPARED' AND
    (NEW."state" = 'PREPARED' OR ROW(NEW."cutoff", NEW."activatedBy") IS DISTINCT FROM ROW(OLD."cutoff", OLD."activatedBy")) THEN
    RAISE EXCEPTION 'Gamification activation boundary is immutable';
  END IF;
  IF OLD."state" = 'PREPARED' AND NEW."state" = 'PAUSED' THEN
    RAISE EXCEPTION 'Gamification activation must precede pause';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gamification_activation_guard BEFORE UPDATE OR DELETE ON "gamification_activations"
FOR EACH ROW EXECUTE FUNCTION protect_gamification_activation();

CREATE FUNCTION protect_gamification_publication_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Gamification publication failure history is immutable';
END $$;
CREATE TRIGGER gamification_publication_failure_guard BEFORE UPDATE OR DELETE ON "gamification_publication_failures"
FOR EACH ROW EXECUTE FUNCTION protect_gamification_publication_failure();
