-- CreateEnum
CREATE TYPE "ForumVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'RESTRICTED');

-- CreateTable
CREATE TABLE "forum_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "visibility" "ForumVisibility" NOT NULL DEFAULT 'PUBLIC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_category_audience" (
    "categoryId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,

    CONSTRAINT "forum_category_audience_pkey" PRIMARY KEY ("categoryId","subjectKey")
);

-- CreateTable
CREATE TABLE "forums" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "allowsGatedContent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_moderator_assignments" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "forum_moderator_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");

-- CreateIndex
CREATE INDEX "forum_categories_active_position_id_idx" ON "forum_categories"("active", "position", "id");

-- CreateIndex
CREATE INDEX "forum_category_audience_subjectKey_categoryId_idx" ON "forum_category_audience"("subjectKey", "categoryId");

-- CreateIndex
CREATE INDEX "forums_categoryId_parentId_position_id_idx" ON "forums"("categoryId", "parentId", "position", "id");

-- CreateIndex
CREATE UNIQUE INDEX "forums_categoryId_slug_key" ON "forums"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "forum_moderator_assignments_moderatorId_revokedAt_idx" ON "forum_moderator_assignments"("moderatorId", "revokedAt");

-- CreateIndex
CREATE INDEX "forum_moderator_assignments_categoryId_revokedAt_idx" ON "forum_moderator_assignments"("categoryId", "revokedAt");

-- AddForeignKey
ALTER TABLE "forum_category_audience" ADD CONSTRAINT "forum_category_audience_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forums" ADD CONSTRAINT "forums_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forums" ADD CONSTRAINT "forums_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "forums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_moderator_assignments" ADD CONSTRAINT "forum_moderator_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_moderator_assignments" ADD CONSTRAINT "forum_moderator_assignments_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_moderator_assignments" ADD CONSTRAINT "forum_moderator_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_moderator_assignments" ADD CONSTRAINT "forum_moderator_assignments_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Structure invariants
ALTER TABLE "forum_categories"
  ADD CONSTRAINT "forum_categories_slug_grammar" CHECK ("slug" ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  ADD CONSTRAINT "forum_categories_title_length" CHECK (char_length(btrim("title")) BETWEEN 2 AND 120),
  ADD CONSTRAINT "forum_categories_description_length" CHECK ("description" IS NULL OR char_length("description") <= 1000),
  ADD CONSTRAINT "forum_categories_position_bounds" CHECK ("position" >= 0);

ALTER TABLE "forum_category_audience"
  ADD CONSTRAINT "forum_category_audience_key_grammar"
    CHECK ("subjectKey" ~ '^(role|group):[a-z][a-z0-9_-]{0,63}$');

ALTER TABLE "forums"
  ADD CONSTRAINT "forums_slug_grammar" CHECK ("slug" ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  ADD CONSTRAINT "forums_title_length" CHECK (char_length(btrim("title")) BETWEEN 2 AND 120),
  ADD CONSTRAINT "forums_description_length" CHECK ("description" IS NULL OR char_length("description") <= 1000),
  ADD CONSTRAINT "forums_position_bounds" CHECK ("position" >= 0),
  ADD CONSTRAINT "forums_not_own_parent" CHECK ("parentId" IS NULL OR "parentId" <> "id");

-- Subforums: one level only, always inside the parent's category.
CREATE FUNCTION enforce_forum_hierarchy() RETURNS trigger AS $$
DECLARE
  parent_category TEXT;
  parent_parent TEXT;
BEGIN
  IF NEW."parentId" IS NOT NULL THEN
    SELECT "categoryId", "parentId" INTO parent_category, parent_parent
    FROM "forums" WHERE "id" = NEW."parentId" FOR SHARE;
    IF parent_category IS DISTINCT FROM NEW."categoryId" THEN
      RAISE EXCEPTION 'A subforum must belong to its parent''s category.';
    END IF;
    IF parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'Subforums support one level of nesting only.';
    END IF;
    IF EXISTS (SELECT 1 FROM "forums" WHERE "parentId" = NEW."id") THEN
      RAISE EXCEPTION 'A forum with subforums cannot become a subforum.';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW."categoryId" <> OLD."categoryId"
    AND EXISTS (SELECT 1 FROM "forums" WHERE "parentId" = NEW."id") THEN
    RAISE EXCEPTION 'Move subforums together with their parent.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "forums_hierarchy"
BEFORE INSERT OR UPDATE OF "parentId", "categoryId" ON "forums"
FOR EACH ROW EXECUTE FUNCTION enforce_forum_hierarchy();

ALTER TABLE "forum_moderator_assignments"
  ADD CONSTRAINT "forum_moderator_assignments_revocation_complete"
    CHECK (("revokedAt" IS NULL) = ("revokedById" IS NULL));

CREATE UNIQUE INDEX "forum_moderator_assignments_one_active"
  ON "forum_moderator_assignments"("categoryId", "moderatorId")
  WHERE "revokedAt" IS NULL;

-- Permissions
INSERT INTO "permissions" ("id", "key", "label", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'forum.structure.manage', 'Manage forum structure',
   'Allows managing forum categories, forums, subforums and category visibility; holders see every category.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'forum.moderators.assign', 'Assign forum moderators',
   'Allows assigning and revoking category moderators.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'forum.moderate.all', 'Moderate every forum category',
   'Supermoderator scope: moderation authority in every forum category.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
JOIN "permissions" ON permissions."key" IN (
  'forum.structure.manage', 'forum.moderators.assign', 'forum.moderate.all'
)
WHERE roles."name" IN ('admin', 'owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

/*
 * Categories organize; forums gather; one level of subforums keeps the map readable.
 */
