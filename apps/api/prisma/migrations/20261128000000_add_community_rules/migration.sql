-- Community rules catalogue (owner 2026-11-27): numbered points a permanent
-- ban refers to. Rules are deactivated, never deleted.
CREATE TABLE "community_rules" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_rules_code_format"
    CHECK ("code" ~ '^[0-9]{1,3}(\.[0-9]{1,3}){0,2}$'),
  CONSTRAINT "community_rules_text_length"
    CHECK (char_length("text") BETWEEN 3 AND 1000)
);

CREATE UNIQUE INDEX "community_rules_code_key" ON "community_rules"("code");

ALTER TABLE "community_rules" ADD CONSTRAINT "community_rules_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'moderation.rules.manage', 'Manage community rules',
   'Allows editing the numbered community rules catalogue.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'moderation.rules.manage'
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
