-- Section switches (Command Deck › Community Hub)
ALTER TABLE "forums"
  ADD COLUMN "allowTopics" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowReplies" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowPolls" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowAttachments" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "listed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "searchable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showCounts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pinnedLimit" INTEGER,
  ADD CONSTRAINT "forums_pinned_limit_range" CHECK ("pinnedLimit" IS NULL OR "pinnedLimit" BETWEEN 0 AND 100);

-- Forum-level moderator assignments (null forumId = whole category)
ALTER TABLE "forum_moderator_assignments" ADD COLUMN "forumId" TEXT;
ALTER TABLE "forum_moderator_assignments" ADD CONSTRAINT "forum_moderator_assignments_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "forums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "forum_moderator_assignments_forumId_revokedAt_idx" ON "forum_moderator_assignments"("forumId", "revokedAt");
DROP INDEX "forum_moderator_assignments_one_active";
CREATE UNIQUE INDEX "forum_moderator_assignments_one_active"
  ON "forum_moderator_assignments"("categoryId", COALESCE("forumId", ''), "moderatorId")
  WHERE "revokedAt" IS NULL;

-- Per-section role matrix
CREATE TYPE "ForumAccessRole" AS ENUM ('GUEST', 'MEMBER', 'CONTRIBUTOR', 'MODERATOR', 'ADMIN');

CREATE TABLE "forum_access_rules" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "forumId" TEXT,
    "role" "ForumAccessRole" NOT NULL,
    "canView" BOOLEAN NOT NULL,
    "canRead" BOOLEAN NOT NULL,
    "canCreateTopics" BOOLEAN NOT NULL,
    "canReply" BOOLEAN NOT NULL,
    "canEditOwn" BOOLEAN NOT NULL,
    "canDeleteOwn" BOOLEAN NOT NULL,
    "canModerate" BOOLEAN NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_access_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "forum_access_rules_one_scope" CHECK (("categoryId" IS NULL) <> ("forumId" IS NULL)),
    CONSTRAINT "forum_access_rules_read_needs_view" CHECK (NOT "canRead" OR "canView"),
    CONSTRAINT "forum_access_rules_guest_read_only" CHECK (
      "role" <> 'GUEST' OR NOT ("canCreateTopics" OR "canReply" OR "canEditOwn" OR "canDeleteOwn" OR "canModerate")
    ),
    CONSTRAINT "forum_access_rules_admin_full" CHECK (
      "role" <> 'ADMIN' OR ("canView" AND "canRead" AND "canCreateTopics" AND "canReply" AND "canEditOwn" AND "canDeleteOwn" AND "canModerate")
    )
);

CREATE UNIQUE INDEX "forum_access_rules_categoryId_role_key" ON "forum_access_rules"("categoryId", "role");
CREATE UNIQUE INDEX "forum_access_rules_forumId_role_key" ON "forum_access_rules"("forumId", "role");
ALTER TABLE "forum_access_rules" ADD CONSTRAINT "forum_access_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_access_rules" ADD CONSTRAINT "forum_access_rules_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "forums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Contributor role (owner decision 2026-11-22): forum-only, assigned by admins.
INSERT INTO "roles" ("id", "name", "label", "description", "isSystem", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'contributor', 'Contributor', 'Trusted community author; forum rights come from section access matrices.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "isSystem" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles" JOIN "permissions" ON permissions."key" = 'users.read'
WHERE roles."name" = 'contributor'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

