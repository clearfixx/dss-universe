/*
 * DSS File Passport
 * File: apps/api/prisma/migrations/20260729123000_add_custom_titles_foundation/migration.sql
 * Purpose: Adds permission-neutral custom titles, historical grants, selection, and cooldown policy.
 */

CREATE TABLE "custom_titles" (
  "id" TEXT NOT NULL,
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
  CONSTRAINT "custom_titles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "custom_titles_name_key" UNIQUE ("name"),
  CONSTRAINT "custom_titles_slug_key" UNIQUE ("slug"),
  CONSTRAINT "custom_titles_color_check"
    CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "custom_titles_name_check"
    CHECK (char_length(btrim("name")) BETWEEN 2 AND 64),
  CONSTRAINT "custom_titles_badge_check"
    CHECK (char_length(btrim("badge")) BETWEEN 1 AND 64)
);

CREATE INDEX "custom_titles_isActive_name_idx"
  ON "custom_titles"("isActive", "name");

CREATE TABLE "user_title_grants" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "grantReason" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokeReason" TEXT,
  CONSTRAINT "user_title_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_title_grants_lifecycle_check" CHECK (
    ("revokedAt" IS NULL AND "revokedById" IS NULL AND "revokeReason" IS NULL)
    OR
    ("revokedAt" IS NOT NULL AND "revokedById" IS NOT NULL
      AND char_length(btrim("revokeReason")) BETWEEN 3 AND 500)
  ),
  CONSTRAINT "user_title_grants_reason_check"
    CHECK (char_length(btrim("grantReason")) BETWEEN 3 AND 500),
  CONSTRAINT "user_title_grants_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_title_grants_titleId_fkey"
    FOREIGN KEY ("titleId") REFERENCES "custom_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "user_title_grants_active_key"
  ON "user_title_grants"("userId", "titleId")
  WHERE "revokedAt" IS NULL;
CREATE INDEX "user_title_grants_userId_grantedAt_id_idx"
  ON "user_title_grants"("userId", "grantedAt", "id");
CREATE INDEX "user_title_grants_titleId_revokedAt_idx"
  ON "user_title_grants"("titleId", "revokedAt");

CREATE TABLE "user_title_selections" (
  "userId" TEXT NOT NULL,
  "grantId" TEXT NOT NULL,
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_title_selections_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "user_title_selections_grantId_key" UNIQUE ("grantId"),
  CONSTRAINT "user_title_selections_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_title_selections_grantId_fkey"
    FOREIGN KEY ("grantId") REFERENCES "user_title_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "custom_title_settings" (
  "id" TEXT NOT NULL,
  "selectionCooldownDays" INTEGER NOT NULL DEFAULT 30,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_title_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "custom_title_settings_cooldown_check"
    CHECK ("selectionCooldownDays" BETWEEN 0 AND 3650)
);

INSERT INTO "custom_title_settings"
  ("id", "selectionCooldownDays", "updatedAt")
VALUES ('global', 30, CURRENT_TIMESTAMP);

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid(),
    'custom-titles.manage',
    'Manage custom titles',
    'Allows creating, updating, granting, and revoking custom titles.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'custom-titles.settings.manage',
    'Manage custom title settings',
    'Allows updating custom title selection policy.',
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
JOIN "permissions" ON permissions."key" IN (
  'custom-titles.manage',
  'custom-titles.settings.manage'
)
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

CREATE FUNCTION prevent_user_title_grant_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'custom title grants are historical and cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_title_grants_prevent_delete"
BEFORE DELETE ON "user_title_grants"
FOR EACH ROW EXECUTE FUNCTION prevent_user_title_grant_delete();

/*
 * A title may brighten a nickname. It must never quietly unlock a door.
 */
