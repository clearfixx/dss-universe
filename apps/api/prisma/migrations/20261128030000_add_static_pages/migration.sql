-- Static pages (owner 2026-11-28): a working copy and the published snapshot.
CREATE TABLE "static_pages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "document" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "publishedTitle" TEXT,
  "publishedDescription" TEXT,
  "publishedDocument" JSONB,
  "publishedRevision" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "static_pages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "static_pages_slug_format"
    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("slug") <= 80),
  CONSTRAINT "static_pages_title_length"
    CHECK (char_length("title") BETWEEN 3 AND 160),
  CONSTRAINT "static_pages_description_length"
    CHECK (char_length("description") <= 300),
  CONSTRAINT "static_pages_publication_complete" CHECK (
    ("publishedAt" IS NULL AND "publishedTitle" IS NULL AND "publishedDescription" IS NULL
      AND "publishedDocument" IS NULL AND "publishedRevision" IS NULL)
    OR ("publishedAt" IS NOT NULL AND "publishedTitle" IS NOT NULL AND "publishedDescription" IS NOT NULL
      AND "publishedDocument" IS NOT NULL AND "publishedRevision" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "static_pages_slug_key" ON "static_pages"("slug");
ALTER TABLE "static_pages" ADD CONSTRAINT "static_pages_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "static_pages" ADD CONSTRAINT "static_pages_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'cms.pages.manage', 'Manage static pages',
   'Allows creating, editing and publishing static pages.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" = 'cms.pages.manage'
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
