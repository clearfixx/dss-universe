/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab RL-0 E2E
 * 📄 File: apps/api/test/research-lab-foundation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies Research Lab relational guards on a fully migrated disposable schema.
 *
 * 🏗️ Architecture:
 * Raw fixture writes characterize database invariants before repositories exist.
 *
 * ⚠️ Important:
 * The suite owns and drops only its generated schema in dss_test.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash, randomUUID } from 'node:crypto';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Research Lab foundation constraints (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function createUser() {
    const id = randomUUID();
    await fixture.prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, username, "passwordHash", "updatedAt")
       VALUES ($1, $2, $3, 'fixture-hash', CURRENT_TIMESTAMP)`,
      id,
      `research-${id}@dss.test`,
      `research-${id}`,
    );
    return id;
  }

  async function createPage(creatorId: string) {
    const pageId = randomUUID();
    const targetId = randomUUID();
    await fixture.prisma.$executeRawUnsafe(
      `INSERT INTO interaction_targets
        (id, kind, "ownerModule", "ownerType", "ownerId")
       VALUES ($1, 'research-lab.page', 'research-lab', 'ResearchPage', $2)`,
      targetId,
      pageId,
    );
    await fixture.prisma.$executeRawUnsafe(
      `INSERT INTO research_pages
        (id, "interactionTargetId", "creatorId", slug, "updatedAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      pageId,
      targetId,
      creatorId,
      `page-${pageId}`,
    );
    return pageId;
  }

  async function createRevision(pageId: string, authorId: string) {
    const revisionId = randomUUID();
    const contentHash = createHash('sha256').update(revisionId).digest('hex');
    await fixture.prisma.$executeRawUnsafe(
      `INSERT INTO research_revisions
        (id, "pageId", number, "authorId", title, summary, "proposedSlug",
         document, "plainText", "searchText", "editSummary", "contentHash")
       VALUES ($1, $2, 1, $3, 'Title', 'Summary', $4,
         '{}'::jsonb, 'Text', 'Text', 'Initial revision', $5)`,
      revisionId,
      pageId,
      authorId,
      `page-${pageId}`,
      contentHash,
    );
    return revisionId;
  }

  it('creates exactly the reviewed table and guard inventory', async () => {
    const tables = await fixture.prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name LIKE 'research_%'
       ORDER BY table_name`,
      fixture.schema,
    );
    expect(tables.map(({ name }) => name)).toEqual([
      'research_categories',
      'research_collection_items',
      'research_collections',
      'research_drafts',
      'research_internal_links',
      'research_manual_chapters',
      'research_manuals',
      'research_page_audience_groups',
      'research_page_categories',
      'research_page_tags',
      'research_page_technologies',
      'research_pages',
      'research_review_decisions',
      'research_revisions',
      'research_slug_aliases',
      'research_tags',
      'research_technologies',
    ]);
    const guards = await fixture.prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT conname AS name FROM pg_constraint
       WHERE connamespace = $1::regnamespace
         AND conname LIKE 'research_%_check'
       ORDER BY conname`,
      fixture.schema,
    );
    expect(guards).toHaveLength(15);
  });

  it('rejects a published revision that belongs to another page', async () => {
    const userId = await createUser();
    const firstPage = await createPage(userId);
    const secondPage = await createPage(userId);
    const foreignRevision = await createRevision(firstPage, userId);

    await expect(
      fixture.prisma.$executeRawUnsafe(
        `UPDATE research_pages SET "publishedRevisionId" = $1 WHERE id = $2`,
        foreignRevision,
        secondPage,
      ),
    ).rejects.toThrow();
  });

  it('requires complete tombstone audit facts', async () => {
    const userId = await createUser();
    const pageId = await createPage(userId);

    await expect(
      fixture.prisma.$executeRawUnsafe(
        `UPDATE research_pages SET state = 'TOMBSTONED',
          "tombstonedAt" = CURRENT_TIMESTAMP, "tombstonedById" = $1
         WHERE id = $2`,
        userId,
        pageId,
      ),
    ).rejects.toThrow();
  });

  it('rejects duplicate root slugs and self-links', async () => {
    await fixture.prisma.$executeRawUnsafe(
      `INSERT INTO research_categories (id, name, slug, "updatedAt")
       VALUES ($1, 'Root', 'root', CURRENT_TIMESTAMP)`,
      randomUUID(),
    );
    await expect(
      fixture.prisma.$executeRawUnsafe(
        `INSERT INTO research_categories (id, name, slug, "updatedAt")
         VALUES ($1, 'Duplicate', 'root', CURRENT_TIMESTAMP)`,
        randomUUID(),
      ),
    ).rejects.toThrow();

    const userId = await createUser();
    const pageId = await createPage(userId);
    await expect(
      fixture.prisma.$executeRawUnsafe(
        `INSERT INTO research_internal_links
          (id, "sourcePageId", "targetPageId", "anchorText")
         VALUES ($1, $2, $2, 'Self')`,
        randomUUID(),
        pageId,
      ),
    ).rejects.toThrow();
  });
});
