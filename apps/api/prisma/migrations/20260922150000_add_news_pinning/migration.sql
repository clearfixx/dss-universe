CREATE TYPE "NewsPinScope" AS ENUM ('GLOBAL', 'CATEGORY');

CREATE TABLE "news_pins" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "scope" "NewsPinScope" NOT NULL,
  "categoryId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "pinnedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "news_pins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "news_pins_scope_category_check" CHECK (("scope" = 'GLOBAL' AND "categoryId" IS NULL) OR ("scope" = 'CATEGORY' AND "categoryId" IS NOT NULL))
);

CREATE UNIQUE INDEX "news_pins_articleId_key" ON "news_pins"("articleId");
CREATE INDEX "news_pins_scope_expiresAt_createdAt_idx" ON "news_pins"("scope", "expiresAt", "createdAt");
CREATE INDEX "news_pins_categoryId_expiresAt_createdAt_idx" ON "news_pins"("categoryId", "expiresAt", "createdAt");
ALTER TABLE "news_pins" ADD CONSTRAINT "news_pins_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news_pins" ADD CONSTRAINT "news_pins_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "news_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "news_pins" ADD CONSTRAINT "news_pins_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
