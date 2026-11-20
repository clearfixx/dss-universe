-- CreateEnum
CREATE TYPE "ResearchPageKind" AS ENUM ('WIKI', 'MANUAL', 'RESEARCH', 'GUIDE', 'CASE_STUDY', 'NOTE', 'REPORT');

-- CreateEnum
CREATE TYPE "ResearchPageState" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'TOMBSTONED');

-- CreateEnum
CREATE TYPE "ResearchRevisionState" AS ENUM ('IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ResearchReviewAction" AS ENUM ('SUBMITTED', 'CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED', 'WITHDRAWN', 'ROLLED_BACK', 'RESTORED');

-- CreateEnum
CREATE TYPE "ResearchProtectionLevel" AS ENUM ('OPEN', 'TRUSTED', 'GUARDIAN_ONLY', 'LOCKED');

-- CreateEnum
CREATE TYPE "ResearchVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'GROUPS');

-- CreateEnum
CREATE TYPE "ResearchInternalLinkType" AS ENUM ('RELATED', 'CONTEXTUAL', 'PREREQUISITE', 'SEE_ALSO');

-- CreateTable
CREATE TABLE "research_pages" (
    "id" TEXT NOT NULL,
    "interactionTargetId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "kind" "ResearchPageKind" NOT NULL DEFAULT 'WIKI',
    "state" "ResearchPageState" NOT NULL DEFAULT 'DRAFT',
    "protectionLevel" "ResearchProtectionLevel" NOT NULL DEFAULT 'OPEN',
    "visibility" "ResearchVisibility" NOT NULL DEFAULT 'PUBLIC',
    "language" TEXT NOT NULL DEFAULT 'uk',
    "slug" TEXT NOT NULL,
    "publicationGeneration" INTEGER NOT NULL DEFAULT 0,
    "publishedRevisionId" TEXT,
    "primaryCategoryId" TEXT,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "allowRating" BOOLEAN NOT NULL DEFAULT true,
    "allowIndexing" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "firstPublishedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "tombstonedAt" TIMESTAMP(3),
    "tombstonedById" TEXT,
    "tombstoneReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_drafts" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "basePublishedRevisionId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "proposedSlug" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "coverMediaId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_revisions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "state" "ResearchRevisionState" NOT NULL DEFAULT 'IN_REVIEW',
    "basePublishedRevisionId" TEXT,
    "rollbackFromRevisionId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "proposedSlug" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "coverMediaId" TEXT,
    "editSummary" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_review_decisions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ResearchReviewAction" NOT NULL,
    "reason" TEXT,
    "policySnapshotHash" TEXT NOT NULL,
    "auditCorrelationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_review_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_page_audience_groups" (
    "pageId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,

    CONSTRAINT "research_page_audience_groups_pkey" PRIMARY KEY ("pageId","groupKey")
);

-- CreateTable
CREATE TABLE "research_categories" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_page_categories" (
    "pageId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "research_page_categories_pkey" PRIMARY KEY ("pageId","categoryId")
);

-- CreateTable
CREATE TABLE "research_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_page_tags" (
    "pageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "research_page_tags_pkey" PRIMARY KEY ("pageId","tagId")
);

-- CreateTable
CREATE TABLE "research_technologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_page_technologies" (
    "pageId" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,

    CONSTRAINT "research_page_technologies_pkey" PRIMARY KEY ("pageId","technologyId")
);

-- CreateTable
CREATE TABLE "research_manuals" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'uk',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_manuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_manual_chapters" (
    "manualId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "research_manual_chapters_pkey" PRIMARY KEY ("manualId","pageId")
);

-- CreateTable
CREATE TABLE "research_collections" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'uk',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_collection_items" (
    "collectionId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "research_collection_items_pkey" PRIMARY KEY ("collectionId","pageId")
);

-- CreateTable
CREATE TABLE "research_slug_aliases" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_slug_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_internal_links" (
    "id" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "type" "ResearchInternalLinkType" NOT NULL DEFAULT 'RELATED',
    "anchorText" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_internal_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_pages_interactionTargetId_key" ON "research_pages"("interactionTargetId");

-- CreateIndex
-- CreateIndex
CREATE INDEX "research_pages_state_lastPublishedAt_id_idx" ON "research_pages"("state", "lastPublishedAt", "id");

-- CreateIndex
CREATE INDEX "research_pages_creatorId_state_updatedAt_idx" ON "research_pages"("creatorId", "state", "updatedAt");

-- CreateIndex
CREATE INDEX "research_pages_kind_state_lastPublishedAt_idx" ON "research_pages"("kind", "state", "lastPublishedAt");

-- CreateIndex
CREATE INDEX "research_pages_primaryCategoryId_state_lastPublishedAt_idx" ON "research_pages"("primaryCategoryId", "state", "lastPublishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "research_pages_language_slug_key" ON "research_pages"("language", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "research_pages_publishedRevisionId_id_key" ON "research_pages"("publishedRevisionId", "id");

-- CreateIndex
CREATE INDEX "research_drafts_authorId_updatedAt_id_idx" ON "research_drafts"("authorId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "research_drafts_pageId_updatedAt_idx" ON "research_drafts"("pageId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "research_drafts_pageId_authorId_key" ON "research_drafts"("pageId", "authorId");

-- CreateIndex
CREATE INDEX "research_revisions_pageId_state_createdAt_id_idx" ON "research_revisions"("pageId", "state", "createdAt", "id");

-- CreateIndex
CREATE INDEX "research_revisions_authorId_createdAt_id_idx" ON "research_revisions"("authorId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "research_revisions_basePublishedRevisionId_idx" ON "research_revisions"("basePublishedRevisionId");

-- CreateIndex
CREATE INDEX "research_revisions_rollbackFromRevisionId_idx" ON "research_revisions"("rollbackFromRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "research_revisions_pageId_number_key" ON "research_revisions"("pageId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "research_revisions_id_pageId_key" ON "research_revisions"("id", "pageId");

-- CreateIndex
CREATE INDEX "research_review_decisions_pageId_createdAt_id_idx" ON "research_review_decisions"("pageId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "research_review_decisions_revisionId_createdAt_id_idx" ON "research_review_decisions"("revisionId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "research_review_decisions_actorId_action_createdAt_idx" ON "research_review_decisions"("actorId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "research_page_audience_groups_groupKey_pageId_idx" ON "research_page_audience_groups"("groupKey", "pageId");

-- CreateIndex
CREATE INDEX "research_categories_parentId_isActive_sortOrder_id_idx" ON "research_categories"("parentId", "isActive", "sortOrder", "id");

-- CreateIndex
CREATE UNIQUE INDEX "research_categories_parentId_slug_key" ON "research_categories"("parentId", "slug");

-- CreateIndex
CREATE INDEX "research_page_categories_categoryId_position_pageId_idx" ON "research_page_categories"("categoryId", "position", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "research_tags_slug_key" ON "research_tags"("slug");

-- CreateIndex
CREATE INDEX "research_page_tags_tagId_pageId_idx" ON "research_page_tags"("tagId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "research_technologies_slug_key" ON "research_technologies"("slug");

-- CreateIndex
CREATE INDEX "research_page_technologies_technologyId_pageId_idx" ON "research_page_technologies"("technologyId", "pageId");

-- CreateIndex
CREATE INDEX "research_manuals_isActive_title_id_idx" ON "research_manuals"("isActive", "title", "id");

-- CreateIndex
CREATE UNIQUE INDEX "research_manuals_language_slug_key" ON "research_manuals"("language", "slug");

-- CreateIndex
CREATE INDEX "research_manual_chapters_pageId_manualId_idx" ON "research_manual_chapters"("pageId", "manualId");

-- CreateIndex
CREATE UNIQUE INDEX "research_manual_chapters_manualId_position_key" ON "research_manual_chapters"("manualId", "position");

-- CreateIndex
CREATE INDEX "research_collections_isActive_title_id_idx" ON "research_collections"("isActive", "title", "id");

-- CreateIndex
CREATE UNIQUE INDEX "research_collections_language_slug_key" ON "research_collections"("language", "slug");

-- CreateIndex
CREATE INDEX "research_collection_items_pageId_collectionId_idx" ON "research_collection_items"("pageId", "collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "research_collection_items_collectionId_position_key" ON "research_collection_items"("collectionId", "position");

-- CreateIndex
CREATE INDEX "research_slug_aliases_pageId_createdAt_idx" ON "research_slug_aliases"("pageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "research_slug_aliases_language_slug_key" ON "research_slug_aliases"("language", "slug");

-- CreateIndex
CREATE INDEX "research_internal_links_sourcePageId_position_id_idx" ON "research_internal_links"("sourcePageId", "position", "id");

-- CreateIndex
CREATE INDEX "research_internal_links_targetPageId_type_id_idx" ON "research_internal_links"("targetPageId", "type", "id");

-- CreateIndex
CREATE UNIQUE INDEX "research_internal_links_sourcePageId_targetPageId_type_key" ON "research_internal_links"("sourcePageId", "targetPageId", "type");

-- AddForeignKey
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_interactionTargetId_fkey" FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_publishedRevisionId_id_fkey" FOREIGN KEY ("publishedRevisionId", "id") REFERENCES "research_revisions"("id", "pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "research_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_tombstonedById_fkey" FOREIGN KEY ("tombstonedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_drafts" ADD CONSTRAINT "research_drafts_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_drafts" ADD CONSTRAINT "research_drafts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_drafts" ADD CONSTRAINT "research_drafts_basePublishedRevisionId_pageId_fkey" FOREIGN KEY ("basePublishedRevisionId", "pageId") REFERENCES "research_revisions"("id", "pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_basePublishedRevisionId_pageId_fkey" FOREIGN KEY ("basePublishedRevisionId", "pageId") REFERENCES "research_revisions"("id", "pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_rollbackFromRevisionId_pageId_fkey" FOREIGN KEY ("rollbackFromRevisionId", "pageId") REFERENCES "research_revisions"("id", "pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_review_decisions" ADD CONSTRAINT "research_review_decisions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_review_decisions" ADD CONSTRAINT "research_review_decisions_revisionId_pageId_fkey" FOREIGN KEY ("revisionId", "pageId") REFERENCES "research_revisions"("id", "pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_review_decisions" ADD CONSTRAINT "research_review_decisions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_audience_groups" ADD CONSTRAINT "research_page_audience_groups_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_categories" ADD CONSTRAINT "research_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "research_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_categories" ADD CONSTRAINT "research_page_categories_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_categories" ADD CONSTRAINT "research_page_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "research_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_tags" ADD CONSTRAINT "research_page_tags_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_tags" ADD CONSTRAINT "research_page_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "research_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_technologies" ADD CONSTRAINT "research_page_technologies_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_page_technologies" ADD CONSTRAINT "research_page_technologies_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "research_technologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_manual_chapters" ADD CONSTRAINT "research_manual_chapters_manualId_fkey" FOREIGN KEY ("manualId") REFERENCES "research_manuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_manual_chapters" ADD CONSTRAINT "research_manual_chapters_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_collection_items" ADD CONSTRAINT "research_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "research_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_collection_items" ADD CONSTRAINT "research_collection_items_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_slug_aliases" ADD CONSTRAINT "research_slug_aliases_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_internal_links" ADD CONSTRAINT "research_internal_links_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "research_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_internal_links" ADD CONSTRAINT "research_internal_links_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "research_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Research Lab owner invariants not expressible in Prisma schema.
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_publication_generation_check" CHECK ("publicationGeneration" >= 0);
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_active_revision_check" CHECK ("state" NOT IN ('ACTIVE', 'ARCHIVED') OR "publishedRevisionId" IS NOT NULL);
ALTER TABLE "research_pages" ADD CONSTRAINT "research_pages_tombstone_audit_check" CHECK (
  ("state" = 'TOMBSTONED' AND "tombstonedAt" IS NOT NULL AND "tombstonedById" IS NOT NULL AND length(btrim(coalesce("tombstoneReason", ''))) > 0)
  OR
  ("state" <> 'TOMBSTONED' AND "tombstonedAt" IS NULL AND "tombstonedById" IS NULL AND "tombstoneReason" IS NULL)
);
ALTER TABLE "research_drafts" ADD CONSTRAINT "research_drafts_version_check" CHECK ("version" > 0);
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_number_check" CHECK ("number" > 0);
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_not_own_base_check" CHECK ("basePublishedRevisionId" IS NULL OR "basePublishedRevisionId" <> "id");
ALTER TABLE "research_revisions" ADD CONSTRAINT "research_revisions_not_own_rollback_check" CHECK ("rollbackFromRevisionId" IS NULL OR "rollbackFromRevisionId" <> "id");
ALTER TABLE "research_review_decisions" ADD CONSTRAINT "research_review_decisions_evidence_check" CHECK (length(btrim("policySnapshotHash")) > 0 AND length(btrim("auditCorrelationId")) > 0);
ALTER TABLE "research_page_audience_groups" ADD CONSTRAINT "research_page_audience_groups_key_check" CHECK ("groupKey" ~ '^[a-z][a-z0-9-]{0,63}$');
ALTER TABLE "research_categories" ADD CONSTRAINT "research_categories_not_own_parent_check" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "research_page_categories" ADD CONSTRAINT "research_page_categories_position_check" CHECK ("position" >= 0);
ALTER TABLE "research_manual_chapters" ADD CONSTRAINT "research_manual_chapters_position_check" CHECK ("position" >= 0);
ALTER TABLE "research_collection_items" ADD CONSTRAINT "research_collection_items_position_check" CHECK ("position" >= 0);
ALTER TABLE "research_internal_links" ADD CONSTRAINT "research_internal_links_not_self_check" CHECK ("sourcePageId" <> "targetPageId");
ALTER TABLE "research_internal_links" ADD CONSTRAINT "research_internal_links_position_check" CHECK ("position" >= 0);

-- PostgreSQL treats NULLs as distinct in a composite unique index. Root
-- categories therefore need an explicit partial index.
CREATE UNIQUE INDEX "research_categories_root_slug_key"
ON "research_categories"("slug")
WHERE "parentId" IS NULL;
