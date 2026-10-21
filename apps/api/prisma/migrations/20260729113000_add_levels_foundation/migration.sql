CREATE TYPE "LevelTransitionDirection" AS ENUM ('UP', 'DOWN');

CREATE TABLE "level_definitions" (
    "level" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_definitions_pkey" PRIMARY KEY ("level"),
    CONSTRAINT "level_definitions_level_check" CHECK ("level" BETWEEN 1 AND 1000),
    CONSTRAINT "level_definitions_threshold_check" CHECK ("threshold" > 0)
);

CREATE TABLE "level_transitions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "direction" "LevelTransitionDirection" NOT NULL,
    "balance" INTEGER NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "sourceEventName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_transitions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "level_transitions_levels_check" CHECK (
        "fromLevel" >= 0 AND
        "toLevel" >= 0 AND
        "fromLevel" <> "toLevel"
    ),
    CONSTRAINT "level_transitions_direction_check" CHECK (
        ("direction" = 'UP' AND "toLevel" > "fromLevel") OR
        ("direction" = 'DOWN' AND "toLevel" < "fromLevel")
    )
);

CREATE UNIQUE INDEX "level_definitions_threshold_key"
ON "level_definitions"("threshold");

CREATE UNIQUE INDEX "level_transitions_sourceEventId_toLevel_key"
ON "level_transitions"("sourceEventId", "toLevel");

CREATE INDEX "level_transitions_userId_occurredAt_id_idx"
ON "level_transitions"("userId", "occurredAt", "id");

CREATE INDEX "level_transitions_userId_createdAt_idx"
ON "level_transitions"("userId", "createdAt");

ALTER TABLE "level_transitions"
ADD CONSTRAINT "level_transitions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_level_transition_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'level transition history is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "level_transitions_immutable_update"
BEFORE UPDATE ON "level_transitions"
FOR EACH ROW EXECUTE FUNCTION prevent_level_transition_mutation();

CREATE TRIGGER "level_transitions_immutable_delete"
BEFORE DELETE ON "level_transitions"
FOR EACH ROW EXECUTE FUNCTION prevent_level_transition_mutation();

INSERT INTO "level_definitions"
    ("level", "threshold", "createdAt", "updatedAt")
VALUES
    (1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 350, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (6, 550, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (7, 800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (8, 1100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (9, 1450, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (10, 1850, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (11, 2300, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (12, 2800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (13, 3400, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (14, 4100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (15, 5000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("level") DO NOTHING;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'levels.settings.manage', 'Manage level settings', 'Allows creating and updating Community Points level thresholds.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" role
CROSS JOIN "permissions" permission
WHERE role."name" IN ('admin', 'owner')
  AND permission."key" = 'levels.settings.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Levels show progress. They never get to invent the points.
