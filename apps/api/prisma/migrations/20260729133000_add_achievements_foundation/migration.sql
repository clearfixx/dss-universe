/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260729133000_add_achievements_foundation/migration.sql
 * Purpose: Adds event-driven and manual achievements with reversible award history.
 */

CREATE TYPE "AchievementAwardKind" AS ENUM ('RULE', 'MANUAL');

CREATE TABLE "achievement_definitions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL,
  "badge" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "achievement_definitions_key_key" UNIQUE ("key"),
  CONSTRAINT "achievement_definitions_slug_key" UNIQUE ("slug"),
  CONSTRAINT "achievement_definitions_color_check"
    CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "achievement_definitions_key_check"
    CHECK ("key" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  CONSTRAINT "achievement_definitions_name_check"
    CHECK (char_length(btrim("name")) BETWEEN 2 AND 80),
  CONSTRAINT "achievement_definitions_badge_check"
    CHECK (char_length(btrim("badge")) BETWEEN 1 AND 64)
);

CREATE INDEX "achievement_definitions_isActive_name_idx"
  ON "achievement_definitions"("isActive", "name");

CREATE TABLE "achievement_rules" (
  "id" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "recipientPayloadKey" TEXT NOT NULL DEFAULT 'userId',
  "repeatable" BOOLEAN NOT NULL DEFAULT false,
  "cooldownHours" INTEGER NOT NULL DEFAULT 0,
  "dailyCap" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "achievement_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "achievement_rules_policy_check" CHECK (
    "cooldownHours" BETWEEN 0 AND 87600
    AND ("dailyCap" IS NULL OR "dailyCap" BETWEEN 1 AND 1000)
  ),
  CONSTRAINT "achievement_rules_event_check"
    CHECK ("eventName" ~ '^[a-z0-9]+([.-][a-z0-9]+)*\.v[1-9][0-9]*$'),
  CONSTRAINT "achievement_rules_recipient_key_check"
    CHECK ("recipientPayloadKey" ~ '^[A-Za-z][A-Za-z0-9_]{0,63}$'),
  CONSTRAINT "achievement_rules_achievementId_fkey"
    FOREIGN KEY ("achievementId") REFERENCES "achievement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "achievement_rules_achievementId_eventName_key"
  ON "achievement_rules"("achievementId", "eventName");
CREATE INDEX "achievement_rules_eventName_enabled_idx"
  ON "achievement_rules"("eventName", "enabled");

CREATE TABLE "achievement_awards" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "ruleId" TEXT,
  "kind" "AchievementAwardKind" NOT NULL,
  "reason" TEXT NOT NULL,
  "awardedById" TEXT,
  "sourceEventId" TEXT,
  "sourceEventName" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "achievement_awards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "achievement_awards_reason_check"
    CHECK (char_length(btrim("reason")) BETWEEN 3 AND 500),
  CONSTRAINT "achievement_awards_source_check" CHECK (
    ("kind" = 'RULE' AND "ruleId" IS NOT NULL AND "sourceEventId" IS NOT NULL
      AND "sourceEventName" IS NOT NULL)
    OR
    ("kind" = 'MANUAL' AND "awardedById" IS NOT NULL)
  ),
  CONSTRAINT "achievement_awards_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "achievement_awards_achievementId_fkey"
    FOREIGN KEY ("achievementId") REFERENCES "achievement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "achievement_awards_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "achievement_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "achievement_awards_achievementId_sourceEventId_key"
  ON "achievement_awards"("achievementId", "sourceEventId");
CREATE INDEX "achievement_awards_userId_awardedAt_id_idx"
  ON "achievement_awards"("userId", "awardedAt", "id");
CREATE INDEX "achievement_awards_sourceType_sourceId_idx"
  ON "achievement_awards"("sourceType", "sourceId");
CREATE INDEX "achievement_awards_ruleId_userId_awardedAt_idx"
  ON "achievement_awards"("ruleId", "userId", "awardedAt");

CREATE TABLE "achievement_award_revocations" (
  "id" TEXT NOT NULL,
  "awardId" TEXT NOT NULL,
  "revokedById" TEXT,
  "reason" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "achievement_award_revocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "achievement_award_revocations_awardId_key" UNIQUE ("awardId"),
  CONSTRAINT "achievement_award_revocations_reason_check"
    CHECK (char_length(btrim("reason")) BETWEEN 3 AND 500),
  CONSTRAINT "achievement_award_revocations_awardId_fkey"
    FOREIGN KEY ("awardId") REFERENCES "achievement_awards"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "achievement_award_revocations_occurredAt_idx"
  ON "achievement_award_revocations"("occurredAt");

CREATE OR REPLACE FUNCTION prevent_achievement_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'achievement award history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "achievement_awards_immutable_update"
BEFORE UPDATE ON "achievement_awards"
FOR EACH ROW EXECUTE FUNCTION prevent_achievement_history_mutation();

CREATE TRIGGER "achievement_awards_immutable_delete"
BEFORE DELETE ON "achievement_awards"
FOR EACH ROW EXECUTE FUNCTION prevent_achievement_history_mutation();

CREATE TRIGGER "achievement_revocations_immutable_update"
BEFORE UPDATE ON "achievement_award_revocations"
FOR EACH ROW EXECUTE FUNCTION prevent_achievement_history_mutation();

CREATE TRIGGER "achievement_revocations_immutable_delete"
BEFORE DELETE ON "achievement_award_revocations"
FOR EACH ROW EXECUTE FUNCTION prevent_achievement_history_mutation();

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'achievements.manage',
  'Manage achievements',
  'Allows managing achievement definitions, rules, awards, and rollbacks.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'achievements.manage'
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

/*
 * Achievements celebrate events. They do not rewrite history after the party.
 */
