-- Phase 10.2 — News taxonomy and typed fields
CREATE TYPE "NewsFieldType" AS ENUM (
  'SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'BOOLEAN', 'DATETIME', 'SELECT',
  'MULTI_SELECT', 'URL', 'MEDIA', 'GALLERY', 'FILE', 'MEMBER'
);

CREATE TABLE "news_categories" (
  "id" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "allowedPostTypes" "NewsPostType"[] DEFAULT ARRAY['STANDARD', 'TEXT', 'GALLERY', 'VIDEO', 'AUDIO']::"NewsPostType"[],
  "allowComments" BOOLEAN NOT NULL DEFAULT true,
  "allowRating" BOOLEAN NOT NULL DEFAULT true,
  "allowIndexing" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_article_categories" (
  "articleId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "news_article_categories_pkey" PRIMARY KEY ("articleId", "categoryId")
);

CREATE TABLE "news_tags" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_article_tags" (
  "articleId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "news_article_tags_pkey" PRIMARY KEY ("articleId", "tagId")
);

CREATE TABLE "news_field_definitions" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "postType" "NewsPostType",
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "NewsFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "showInShort" BOOLEAN NOT NULL DEFAULT false,
  "showInFull" BOOLEAN NOT NULL DEFAULT true,
  "includeInSearch" BOOLEAN NOT NULL DEFAULT false,
  "filterable" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "news_field_values" (
  "articleId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_field_values_pkey" PRIMARY KEY ("articleId", "definitionId")
);

CREATE UNIQUE INDEX "news_categories_slug_key" ON "news_categories"("slug");
CREATE INDEX "news_categories_parentId_isActive_sortOrder_idx" ON "news_categories"("parentId", "isActive", "sortOrder");
CREATE INDEX "news_article_categories_categoryId_isPrimary_position_idx" ON "news_article_categories"("categoryId", "isPrimary", "position");
CREATE UNIQUE INDEX "news_article_categories_one_primary_idx" ON "news_article_categories"("articleId") WHERE "isPrimary" = true;
CREATE UNIQUE INDEX "news_tags_slug_key" ON "news_tags"("slug");
CREATE INDEX "news_article_tags_tagId_articleId_idx" ON "news_article_tags"("tagId", "articleId");
CREATE UNIQUE INDEX "news_field_definitions_global_key" ON "news_field_definitions"("key") WHERE "categoryId" IS NULL AND "postType" IS NULL;
CREATE UNIQUE INDEX "news_field_definitions_post_key" ON "news_field_definitions"("postType", "key") WHERE "categoryId" IS NULL AND "postType" IS NOT NULL;
CREATE UNIQUE INDEX "news_field_definitions_category_key" ON "news_field_definitions"("categoryId", "key") WHERE "categoryId" IS NOT NULL AND "postType" IS NULL;
CREATE UNIQUE INDEX "news_field_definitions_category_post_key" ON "news_field_definitions"("categoryId", "postType", "key") WHERE "categoryId" IS NOT NULL AND "postType" IS NOT NULL;
CREATE INDEX "news_field_definitions_categoryId_postType_isActive_idx" ON "news_field_definitions"("categoryId", "postType", "isActive");
CREATE INDEX "news_field_values_definitionId_articleId_idx" ON "news_field_values"("definitionId", "articleId");

ALTER TABLE "news_categories" ADD CONSTRAINT "news_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "news_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "news_article_categories" ADD CONSTRAINT "news_article_categories_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_categories" ADD CONSTRAINT "news_article_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "news_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "news_article_tags" ADD CONSTRAINT "news_article_tags_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_article_tags" ADD CONSTRAINT "news_article_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "news_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "news_field_definitions" ADD CONSTRAINT "news_field_definitions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "news_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "news_field_values" ADD CONSTRAINT "news_field_values_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_field_values" ADD CONSTRAINT "news_field_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "news_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
