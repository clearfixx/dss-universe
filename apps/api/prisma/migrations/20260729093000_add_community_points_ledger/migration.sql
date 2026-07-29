CREATE TABLE "community_point_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "sourceEventName" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actorId" TEXT,
    "reversesEntryId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "community_point_entries_points_check" CHECK ("points" <> 0),
    CONSTRAINT "community_point_entries_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 3 AND 500),
    CONSTRAINT "community_point_entries_source_check" CHECK (
        "reversesEntryId" IS NOT NULL OR
        ("sourceEventId" IS NOT NULL AND "sourceEventName" IS NOT NULL)
    )
);

CREATE TABLE "community_point_rules" (
    "key" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payloadValue" INTEGER,
    "points" INTEGER NOT NULL,
    "dailyLimit" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_rules_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "community_point_rules_points_check" CHECK ("points" <> 0 AND "points" BETWEEN -10000 AND 10000),
    CONSTRAINT "community_point_rules_daily_limit_check" CHECK ("dailyLimit" IS NULL OR "dailyLimit" BETWEEN 1 AND 10000)
);

CREATE TABLE "community_point_revoked_sources" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_point_revoked_sources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "community_point_revoked_sources_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 3 AND 500)
);

CREATE UNIQUE INDEX "community_point_entries_sourceEventId_key"
ON "community_point_entries"("sourceEventId");

CREATE UNIQUE INDEX "community_point_entries_reversesEntryId_key"
ON "community_point_entries"("reversesEntryId");

CREATE INDEX "community_point_entries_userId_occurredAt_id_idx"
ON "community_point_entries"("userId", "occurredAt", "id");

CREATE INDEX "community_point_entries_userId_ruleKey_occurredAt_idx"
ON "community_point_entries"("userId", "ruleKey", "occurredAt");

CREATE INDEX "community_point_entries_sourceType_sourceId_idx"
ON "community_point_entries"("sourceType", "sourceId");

CREATE INDEX "community_point_entries_reversesEntryId_idx"
ON "community_point_entries"("reversesEntryId");

CREATE INDEX "community_point_rules_eventName_enabled_idx"
ON "community_point_rules"("eventName", "enabled");

CREATE UNIQUE INDEX "community_point_revoked_sources_sourceEventId_key"
ON "community_point_revoked_sources"("sourceEventId");

CREATE UNIQUE INDEX "community_point_revoked_sources_sourceType_sourceId_key"
ON "community_point_revoked_sources"("sourceType", "sourceId");

CREATE INDEX "community_point_revoked_sources_occurredAt_idx"
ON "community_point_revoked_sources"("occurredAt");

ALTER TABLE "community_point_entries"
ADD CONSTRAINT "community_point_entries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "community_point_entries"
ADD CONSTRAINT "community_point_entries_reversesEntryId_fkey"
FOREIGN KEY ("reversesEntryId") REFERENCES "community_point_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_community_points_ledger_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'community points ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "community_point_entries_immutable_update"
BEFORE UPDATE ON "community_point_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_community_points_ledger_mutation();

CREATE TRIGGER "community_point_entries_immutable_delete"
BEFORE DELETE ON "community_point_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_community_points_ledger_mutation();

INSERT INTO "community_point_rules"
    ("key", "eventName", "payloadValue", "points", "dailyLimit", "enabled", "createdAt", "updatedAt")
VALUES
    ('comment.created', 'comments.comment.created.v1', NULL, 1, 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('forum.topic.created', 'community.topic.created.v1', NULL, 5, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('news.published', 'news.article.published.v1', NULL, 10, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('knowledge.article.published', 'knowledge.article.published.v1', NULL, 50, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('reputation.positive', 'reputation.direct.changed.v1', 1, 10, 25, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('reputation.negative', 'reputation.direct.changed.v1', -1, -10, 25, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'community-points.reverse', 'Reverse Community Points', 'Allows appending compensating Community Points reversals.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'community-points.settings.manage', 'Manage Community Points settings', 'Allows updating Community Points rules and anti-abuse limits.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" role
CROSS JOIN "permissions" permission
WHERE role."name" IN ('moderator', 'admin', 'owner')
  AND permission."key" = 'community-points.reverse'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" role
CROSS JOIN "permissions" permission
WHERE role."name" IN ('admin', 'owner')
  AND permission."key" = 'community-points.settings.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Participation earns coordinates. Corrections leave a trail instead of a crater.
