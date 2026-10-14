-- ===============================================================
-- 🚀 DSS Universe
-- ---------------------------------------------------------------
-- 📦 Module: News Persistence
-- 📄 File: apps/api/prisma/migrations/20261014093000_news_public_search_projection/migration.sql
--
-- 🎯 Purpose:
-- Adds versioned public search evidence without rewriting authored documents.
--
-- 🧠 Responsibilities:
-- • stores only policy-independent public text and gate presence;
-- • invalidates evidence whenever the source document/version changes.
--
-- 🏗️ Architecture:
-- Forward-only News-owned derived storage; canonical backfill runs in Node/Editor.
--
-- ⚠️ Important:
-- Missing evidence is not an empty index or permission to use raw searchText.
-- No Editor parsing or viewer policy is duplicated in PostgreSQL.
--
-- 🚀 Build. Share. Grow.
-- ===============================================================

CREATE TABLE "news_search_projections" (
    "articleId" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "projectionVersion" INTEGER NOT NULL,
    "publicSearchText" TEXT NOT NULL,
    "hasContentGates" BOOLEAN NOT NULL,
    CONSTRAINT "news_search_projections_pkey" PRIMARY KEY ("articleId"),
    CONSTRAINT "news_search_projections_versions" CHECK (
        "sourceVersion" > 0 AND "projectionVersion" > 0
    ),
    CONSTRAINT "news_search_projections_articleId_fkey" FOREIGN KEY ("articleId")
        REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "news_search_projection_gate_scan_idx"
    ON "news_search_projections"("projectionVersion", "hasContentGates", "articleId");

CREATE FUNCTION news_search_invalidate_source() RETURNS TRIGGER AS $$
BEGIN
    IF OLD."document" IS DISTINCT FROM NEW."document"
       OR OLD."currentVersion" IS DISTINCT FROM NEW."currentVersion" THEN
        DELETE FROM "news_search_projections" WHERE "articleId" = OLD."id";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_search_invalidate_source
    BEFORE UPDATE OF "document", "currentVersion" ON "news_articles"
    FOR EACH ROW EXECUTE FUNCTION news_search_invalidate_source();
