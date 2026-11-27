-- Permanent account bans (owner 2026-11-27). Rows are the history of a ban:
-- issued once, lifted at most once, never deleted.
CREATE TABLE "account_bans" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "issuerId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "ruleText" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "contextType" TEXT,
  "contextId" TEXT,
  "contextPath" TEXT,
  "previousStatus" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "liftedAt" TIMESTAMP(3),
  "liftedById" TEXT,
  "liftReason" TEXT,
  CONSTRAINT "account_bans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_bans_not_self" CHECK ("subjectId" <> "issuerId"),
  CONSTRAINT "account_bans_comment_length"
    CHECK (char_length("comment") BETWEEN 3 AND 1000),
  CONSTRAINT "account_bans_previous_status"
    CHECK ("previousStatus" IN ('ACTIVE', 'DEACTIVATED')),
  CONSTRAINT "account_bans_context_pair"
    CHECK (("contextType" IS NULL) = ("contextId" IS NULL)),
  CONSTRAINT "account_bans_lift_complete" CHECK (
    ("liftedAt" IS NULL AND "liftedById" IS NULL AND "liftReason" IS NULL)
    OR ("liftedAt" IS NOT NULL AND "liftedById" IS NOT NULL AND "liftReason" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "account_bans_reference_key" ON "account_bans"("reference");
CREATE INDEX "account_bans_subjectId_issuedAt_idx"
  ON "account_bans"("subjectId", "issuedAt");
-- At most one ban in force per account.
CREATE UNIQUE INDEX "account_bans_one_in_force_per_subject"
  ON "account_bans"("subjectId") WHERE "liftedAt" IS NULL;

ALTER TABLE "account_bans" ADD CONSTRAINT "account_bans_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_bans" ADD CONSTRAINT "account_bans_issuerId_fkey"
  FOREIGN KEY ("issuerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_bans" ADD CONSTRAINT "account_bans_liftedById_fkey"
  FOREIGN KEY ("liftedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_bans" ADD CONSTRAINT "account_bans_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "community_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'moderation.bans.manage', 'Manage permanent bans',
   'Allows banning accounts permanently and lifting bans.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'moderation.bans.manage'
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
