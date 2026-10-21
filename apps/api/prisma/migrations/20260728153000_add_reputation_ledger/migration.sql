CREATE TABLE "reputation_entries" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reversesEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reputation_entries_value_check" CHECK ("value" IN (-1, 1)),
    CONSTRAINT "reputation_entries_not_self_check" CHECK ("reversesEntryId" IS NOT NULL OR "actorId" <> "recipientId"),
    CONSTRAINT "reputation_entries_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 3 AND 500)
);

CREATE TABLE "reputation_policy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "minimumAccountAgeDays" INTEGER NOT NULL DEFAULT 7,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_policy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reputation_policy_account_age_check" CHECK ("minimumAccountAgeDays" BETWEEN 0 AND 3650)
);

CREATE UNIQUE INDEX "reputation_entries_reversesEntryId_key"
ON "reputation_entries"("reversesEntryId");

CREATE INDEX "reputation_entries_recipientId_createdAt_id_idx"
ON "reputation_entries"("recipientId", "createdAt", "id");

CREATE INDEX "reputation_entries_actorId_recipientId_createdAt_idx"
ON "reputation_entries"("actorId", "recipientId", "createdAt");

CREATE INDEX "reputation_entries_reversesEntryId_idx"
ON "reputation_entries"("reversesEntryId");

ALTER TABLE "reputation_entries"
ADD CONSTRAINT "reputation_entries_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reputation_entries"
ADD CONSTRAINT "reputation_entries_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reputation_entries"
ADD CONSTRAINT "reputation_entries_reversesEntryId_fkey"
FOREIGN KEY ("reversesEntryId") REFERENCES "reputation_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_reputation_ledger_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'reputation ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reputation_entries_immutable_update"
BEFORE UPDATE ON "reputation_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_reputation_ledger_mutation();

CREATE TRIGGER "reputation_entries_immutable_delete"
BEFORE DELETE ON "reputation_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_reputation_ledger_mutation();

INSERT INTO "reputation_policy" ("id", "minimumAccountAgeDays", "createdAt", "updatedAt")
VALUES ('default', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'reputation.reverse', 'Reverse reputation', 'Allows reversing direct reputation entries.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'reputation.settings.manage', 'Manage reputation settings', 'Allows updating Reputation policy settings.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" role
CROSS JOIN "permissions" permission
WHERE role."name" IN ('moderator', 'admin', 'owner')
  AND permission."key" = 'reputation.reverse'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" role
CROSS JOIN "permissions" permission
WHERE role."name" IN ('admin', 'owner')
  AND permission."key" = 'reputation.settings.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- The ledger remembers. Reversals explain; they never erase.
