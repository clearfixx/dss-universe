-- CreateEnum
CREATE TYPE "ModerationSanctionKind" AS ENUM ('WARNING', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "ModerationSanctionOrigin" AS ENUM ('MANUAL', 'SCOPED', 'ESCALATION');

-- CreateTable
CREATE TABLE "moderation_sanctions" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "kind" "ModerationSanctionKind" NOT NULL,
    "origin" "ModerationSanctionOrigin" NOT NULL,
    "issuerId" TEXT,
    "reason" TEXT NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "contextPath" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "consumedAt" TIMESTAMP(3),
    "consumedBySanctionId" TEXT,

    CONSTRAINT "moderation_sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_sanction_policy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "warningLifetimeDays" INTEGER NOT NULL DEFAULT 30,
    "escalationWarningCount" INTEGER NOT NULL DEFAULT 3,
    "escalationReadOnlyDays" INTEGER NOT NULL DEFAULT 7,
    "readOnlyMaxDays" INTEGER NOT NULL DEFAULT 365,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_sanction_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_sanctions_subjectId_kind_expiresAt_idx" ON "moderation_sanctions"("subjectId", "kind", "expiresAt");

-- CreateIndex
CREATE INDEX "moderation_sanctions_subjectId_issuedAt_id_idx" ON "moderation_sanctions"("subjectId", "issuedAt", "id");

-- CreateIndex
CREATE INDEX "moderation_sanctions_consumedBySanctionId_idx" ON "moderation_sanctions"("consumedBySanctionId");

-- AddForeignKey
ALTER TABLE "moderation_sanctions" ADD CONSTRAINT "moderation_sanctions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_sanctions" ADD CONSTRAINT "moderation_sanctions_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_sanctions" ADD CONSTRAINT "moderation_sanctions_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_sanctions" ADD CONSTRAINT "moderation_sanctions_consumedBySanctionId_fkey" FOREIGN KEY ("consumedBySanctionId") REFERENCES "moderation_sanctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_sanction_policy" ADD CONSTRAINT "moderation_sanction_policy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Journal invariants
ALTER TABLE "moderation_sanctions"
  ADD CONSTRAINT "moderation_sanctions_reason_length"
    CHECK (char_length(btrim("reason")) BETWEEN 3 AND 1000),
  ADD CONSTRAINT "moderation_sanctions_expiry_after_issue"
    CHECK ("expiresAt" > "issuedAt"),
  ADD CONSTRAINT "moderation_sanctions_issuer_by_origin"
    CHECK (("origin" = 'ESCALATION') = ("issuerId" IS NULL)),
  ADD CONSTRAINT "moderation_sanctions_escalation_is_read_only"
    CHECK ("origin" <> 'ESCALATION' OR "kind" = 'READ_ONLY'),
  ADD CONSTRAINT "moderation_sanctions_no_self_issue"
    CHECK ("issuerId" IS NULL OR "issuerId" <> "subjectId"),
  ADD CONSTRAINT "moderation_sanctions_context_pair"
    CHECK (("contextType" IS NULL) = ("contextId" IS NULL)
      AND ("contextPath" IS NULL OR "contextType" IS NOT NULL)),
  ADD CONSTRAINT "moderation_sanctions_context_bounds"
    CHECK (("contextType" IS NULL OR char_length("contextType") BETWEEN 1 AND 64)
      AND ("contextId" IS NULL OR char_length("contextId") BETWEEN 1 AND 128)
      AND ("contextPath" IS NULL OR (char_length("contextPath") BETWEEN 1 AND 512
        AND left("contextPath", 1) = '/' AND left("contextPath", 2) <> '//'))),
  ADD CONSTRAINT "moderation_sanctions_revocation_complete"
    CHECK ((("revokedAt" IS NULL) = ("revokedById" IS NULL))
      AND (("revokedAt" IS NULL) = ("revokeReason" IS NULL))
      AND ("revokeReason" IS NULL OR char_length(btrim("revokeReason")) BETWEEN 3 AND 1000)),
  ADD CONSTRAINT "moderation_sanctions_consumption_complete"
    CHECK ((("consumedAt" IS NULL) = ("consumedBySanctionId" IS NULL))
      AND ("consumedAt" IS NULL OR "kind" = 'WARNING'));

ALTER TABLE "moderation_sanction_policy"
  ADD CONSTRAINT "moderation_sanction_policy_singleton" CHECK ("id" = 'default'),
  ADD CONSTRAINT "moderation_sanction_policy_bounds"
    CHECK ("warningLifetimeDays" BETWEEN 1 AND 365
      AND "escalationWarningCount" BETWEEN 2 AND 20
      AND "escalationReadOnlyDays" BETWEEN 1 AND 365
      AND "readOnlyMaxDays" BETWEEN 1 AND 3650);

-- The journal is append-only: rows are never deleted and issued facts never change.
CREATE FUNCTION prevent_moderation_sanction_rewrite() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Moderation sanctions are append-only.';
  END IF;
  IF NEW."id" <> OLD."id" OR NEW."subjectId" <> OLD."subjectId"
    OR NEW."kind" <> OLD."kind" OR NEW."origin" <> OLD."origin"
    OR NEW."issuerId" IS DISTINCT FROM OLD."issuerId"
    OR NEW."reason" <> OLD."reason"
    OR NEW."contextType" IS DISTINCT FROM OLD."contextType"
    OR NEW."contextId" IS DISTINCT FROM OLD."contextId"
    OR NEW."contextPath" IS DISTINCT FROM OLD."contextPath"
    OR NEW."issuedAt" <> OLD."issuedAt" OR NEW."expiresAt" <> OLD."expiresAt"
    OR (OLD."revokedAt" IS NOT NULL AND (NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt"
      OR NEW."revokedById" IS DISTINCT FROM OLD."revokedById"
      OR NEW."revokeReason" IS DISTINCT FROM OLD."revokeReason"))
    OR (OLD."consumedAt" IS NOT NULL AND (NEW."consumedAt" IS DISTINCT FROM OLD."consumedAt"
      OR NEW."consumedBySanctionId" IS DISTINCT FROM OLD."consumedBySanctionId")) THEN
    RAISE EXCEPTION 'Issued moderation sanction facts are immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "moderation_sanctions_append_only"
BEFORE UPDATE OR DELETE ON "moderation_sanctions"
FOR EACH ROW EXECUTE FUNCTION prevent_moderation_sanction_rewrite();

INSERT INTO "moderation_sanction_policy" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Permissions
INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'moderation.sanctions.view', 'View sanction journals',
   'Allows reading any user''s private sanctions journal.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'moderation.warnings.issue', 'Issue verbal warnings',
   'Allows issuing expiring verbal warnings.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'moderation.read-only.issue', 'Issue read-only sanctions',
   'Allows issuing temporary read-only sanctions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'moderation.sanctions.revoke', 'Revoke sanctions',
   'Allows revoking active sanctions with a recorded reason.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'moderation.sanctions.staff', 'Sanction staff',
   'Allows sanctioning users who can issue sanctions themselves.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'moderation.policy.manage', 'Manage sanction policy',
   'Allows changing warning lifetime and escalation thresholds.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" IN (
  'moderation.sanctions.view', 'moderation.warnings.issue',
  'moderation.read-only.issue', 'moderation.sanctions.revoke'
)
WHERE roles."name" IN ('moderator', 'admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" IN (
  'moderation.sanctions.staff', 'moderation.policy.manage'
)
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

/*
 * A journal remembers so that moderators do not have to rely on memory.
 */
