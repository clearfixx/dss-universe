/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Search Persistence E2E
 * 📄 File: apps/api/test/news-search-storage.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies atomic public search evidence and source-safe canonical backfill with real migrations.
 *
 * 🧠 Responsibilities:
 * • covers create/save, invalidation, bounded existing-data repair and optimistic conflicts;
 * • observes actual row-lock contention before allowing a competing source edit to commit;
 * • proves malformed sources cannot fall back to private raw text.
 *
 * 🏗️ Architecture:
 * Actual AppModule and an owned disposable schema; synthetic News documents only.
 *
 * ⚠️ Important:
 * This is persistence acceptance, not yet live query/count/pagination or performance acceptance.
 * Authored history triggers remain enabled; fixture cleanup drops only its generated schema.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaService } from '@api/core/database';
import {
  NEWS_SEARCH_PROJECTOR,
  NEWS_SEARCH_PROJECTION_VERSION,
  type NewsSearchProjector,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsSearchBackfillService } from '../src/modules/news/application/services/news-search-backfill.service';
import { NewsSearchInvalidSourceError } from '../src/modules/news/domain/errors/news-search-invalid-source.error';
import { PrismaNewsSearchProjectionRepository } from '../src/modules/news/infrastructure/repositories/prisma-news-search-projection.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('News public search storage and backfill (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let observer: Pool;
  let news: NewsService;
  let backfill: NewsSearchBackfillService;
  let repository: PrismaNewsSearchProjectionRepository;
  let authorId: string;
  let gateId: string;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    const id = randomUUID();
    authorId = (
      await app.get(AuthenticationPresentationService).register({
        email: 'search-storage-' + id + '@dss.test',
        username: 'search-storage-' + id,
        displayName: 'Synthetic Search Pilot',
        password: 'synthetic-search-storage-password-123',
      })
    ).user.id;
    gateId = (
      await app.get(ContentGatesService).create({
        ownerId: authorId,
        operator: 'ALL',
        requirements: [{ kind: 'COMMENTS', threshold: 100, groupKey: null }],
      })
    ).id;
    news = app.get(NewsService);
    backfill = app.get(NewsSearchBackfillService);
    repository = new PrismaNewsSearchProjectionRepository(prisma);
    observer = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
  }, 60000);

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await observer?.end();
    await app?.close();
    await fixture?.close();
  });

  function document(visible = 'alpha', secret = 'synthetic protected text') {
    const result = createEmptyEditorDocument('NEWS');
    result.content.content = [
      { type: 'paragraph', content: [{ type: 'text', text: visible }] },
      {
        type: 'contentGate',
        attrs: { gateId },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: secret }] },
        ],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'gamma' }] },
    ];
    return result;
  }
  function draft(visible = 'alpha') {
    return news.createDraft({
      authorId,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'search-storage-' + randomUUID(),
      title: 'Synthetic search storage article',
      shortText: 'Synthetic public summary.',
      documentJson: JSON.stringify(document(visible)),
      coverMediaId: null,
    });
  }
  async function projection(articleId: string) {
    return prisma.newsSearchProjection.findUniqueOrThrow({
      where: { articleId },
    });
  }
  async function source(articleId: string) {
    const row = await prisma.newsArticle.findUniqueOrThrow({
      where: { id: articleId },
    });
    return {
      articleId,
      sourceVersion: row.currentVersion,
      documentJson: JSON.stringify(row.document),
    };
  }
  function write(snapshot: Awaited<ReturnType<typeof source>>) {
    const evidence = app
      .get<NewsSearchProjector>(NEWS_SEARCH_PROJECTOR)
      .projectPublic(snapshot.documentJson);
    return {
      ...snapshot,
      projectionVersion: NEWS_SEARCH_PROJECTION_VERSION,
      publicSearchText: evidence.searchText,
      hasContentGates: evidence.hasContentGates,
    };
  }

  it('creates public evidence atomically while preserving authored/private projections and the existing domain response', async () => {
    const article = await draft();
    expect(await projection(article.id)).toEqual({
      articleId: article.id,
      sourceVersion: 1,
      projectionVersion: NEWS_SEARCH_PROJECTION_VERSION,
      publicSearchText: 'alpha gamma',
      hasContentGates: true,
    });
    expect(article.searchText).toContain('synthetic protected text');
    expect(JSON.stringify(article.document)).toContain(
      'synthetic protected text',
    );
    expect(Object.hasOwn(article, 'publicSearchText')).toBe(false);
  });

  it('replaces public evidence with exactly the optimistic winner revision and leaves a stale save harmless', async () => {
    const article = await draft();
    const save = {
      articleId: article.id,
      baseVersion: 1,
      changeSummary: 'Synthetic search projection update',
      postType: 'STANDARD' as const,
      visibility: 'PUBLIC' as const,
      language: 'uk',
      slug: article.slug,
      title: article.title,
      shortText: article.shortText,
      documentJson: JSON.stringify(document('new visible')),
      coverMediaId: null,
    };
    expect((await news.saveDraft(authorId, save)).currentVersion).toBe(2);
    const evidence = await projection(article.id);
    expect(evidence).toMatchObject({
      sourceVersion: 2,
      publicSearchText: 'new visible gamma',
      hasContentGates: true,
    });
    await expect(
      news.saveDraft(authorId, {
        ...save,
        documentJson: JSON.stringify(document('stale visible')),
      }),
    ).rejects.toThrow('changed in another session');
    expect(await projection(article.id)).toEqual(evidence);
    expect(
      await prisma.newsRevision.count({ where: { articleId: article.id } }),
    ).toBe(2);
  });

  it('invalidates same-version document edits and rejects a stale snapshot before repairing current content', async () => {
    const article = await draft();
    const old = write(await source(article.id));
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        document: document(
          'changed without version',
        ) as unknown as Prisma.InputJsonValue,
      },
    });
    expect(
      await prisma.newsSearchProjection.findUnique({
        where: { articleId: article.id },
      }),
    ).toBeNull();
    expect(await repository.install(old)).toBe(false);
    expect(await repository.countMissing(NEWS_SEARCH_PROJECTION_VERSION)).toBe(
      1,
    );
    expect(await backfill.run(2)).toEqual({
      processed: 1,
      installed: 1,
      conflicts: 0,
      remaining: 0,
    });
    expect(await projection(article.id)).toMatchObject({
      sourceVersion: 1,
      publicSearchText: 'changed without version gamma',
    });
  });

  it('invalidates version-only edits but preserves evidence for publication/metadata updates', async () => {
    const article = await draft();
    const before = await projection(article.id);
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        title: 'Changed metadata',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    expect(await projection(article.id)).toEqual(before);
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: { currentVersion: 2 },
    });
    expect(
      await prisma.newsSearchProjection.findUnique({
        where: { articleId: article.id },
      }),
    ).toBeNull();
    expect((await backfill.run()).remaining).toBe(0);
    expect(await projection(article.id)).toMatchObject({
      sourceVersion: 2,
      publicSearchText: 'alpha gamma',
    });
  });

  it('rebuilds incompatible algorithm/source versions without changing authored revisions', async () => {
    const article = await draft();
    const before = await source(article.id);
    await prisma.newsSearchProjection.update({
      where: { articleId: article.id },
      data: {
        sourceVersion: 9,
        projectionVersion: 2,
        publicSearchText: 'untrusted stale projection',
      },
    });
    expect(await repository.countMissing(NEWS_SEARCH_PROJECTION_VERSION)).toBe(
      1,
    );
    expect((await backfill.run()).remaining).toBe(0);
    expect(await projection(article.id)).toMatchObject({
      sourceVersion: 1,
      projectionVersion: NEWS_SEARCH_PROJECTION_VERSION,
      publicSearchText: 'alpha gamma',
    });
    expect(await source(article.id)).toEqual(before);
    expect(
      await prisma.newsRevision.count({ where: { articleId: article.id } }),
    ).toBe(1);
  });

  it('backfills every existing row beyond several batch boundaries and is idempotent', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 70; index++)
      ids.push((await draft('existing ' + index)).id);
    await prisma.newsSearchProjection.deleteMany({
      where: { articleId: { in: ids } },
    });
    expect(await backfill.run(7)).toEqual({
      processed: 70,
      installed: 70,
      conflicts: 0,
      remaining: 0,
    });
    expect(
      await prisma.newsSearchProjection.count({
        where: { articleId: { in: ids } },
      }),
    ).toBe(70);
    expect(await backfill.run(7)).toEqual({
      processed: 0,
      installed: 0,
      conflicts: 0,
      remaining: 0,
    });
  }, 15000);

  it('refuses malformed legacy documents without raw-text fallback and resumes after explicit source repair', async () => {
    const article = await draft();
    const original = article.document;
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        document: {
          type: 'doc',
          content: [
            {
              type: 'text',
              text: 'synthetic protected invalid legacy payload',
            },
          ],
        },
      },
    });
    try {
      await expect(backfill.run()).rejects.toEqual(
        new NewsSearchInvalidSourceError(article.id),
      );
      expect(
        await prisma.newsSearchProjection.findUnique({
          where: { articleId: article.id },
        }),
      ).toBeNull();
      expect(
        await repository.countMissing(NEWS_SEARCH_PROJECTION_VERSION),
      ).toBe(1);
    } finally {
      await prisma.newsArticle.update({
        where: { id: article.id },
        data: { document: original as unknown as Prisma.InputJsonValue },
      });
      await backfill.run();
    }
  });

  it('rejects missing or mismatched-version source snapshots without installing evidence', async () => {
    const article = await draft();
    const snapshot = write(await source(article.id));
    const before = await projection(article.id);
    expect(
      await repository.install({ ...snapshot, articleId: randomUUID() }),
    ).toBe(false);
    expect(
      await repository.install({
        ...snapshot,
        sourceVersion: snapshot.sourceVersion + 1,
      }),
    ).toBe(false);
    expect(await projection(article.id)).toEqual(before);
  });

  it('enforces positive source/algorithm versions in the database', async () => {
    const article = await draft();
    await expect(
      prisma.newsSearchProjection.update({
        where: { articleId: article.id },
        data: { sourceVersion: 0 },
      }),
    ).rejects.toThrow('news_search_projections_versions');
    await expect(
      prisma.newsSearchProjection.update({
        where: { articleId: article.id },
        data: { projectionVersion: 0 },
      }),
    ).rejects.toThrow('news_search_projections_versions');
    expect(await repository.countMissing(NEWS_SEARCH_PROJECTION_VERSION)).toBe(
      0,
    );
  });

  async function waitForBlocked(holderPid: number) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const result = await observer.query<{ blocked: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pg_blocking_pids(pid) @> ARRAY[$1]::integer[]) AS blocked',
        [holderPid],
      );
      if (result.rows[0].blocked) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(
      'Expected actual News source row-lock contention was not observed.',
    );
  }

  it('waits on a real source lock and rechecks the document after the competing edit commits', async () => {
    const article = await draft();
    const snapshot = write(await source(article.id));
    const blocker = await observer.connect();
    let pending: Promise<boolean> | undefined;
    let open = false;
    try {
      await blocker.query('BEGIN');
      open = true;
      await blocker.query(
        'SELECT "id" FROM "news_articles" WHERE "id" = $1 FOR UPDATE',
        [article.id],
      );
      const holder = (
        await blocker.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      ).rows[0].pid;
      pending = repository.install(snapshot);
      void pending.catch(() => undefined);
      await waitForBlocked(holder);
      await blocker.query(
        'UPDATE "news_articles" SET "document" = $1::jsonb WHERE "id" = $2',
        [JSON.stringify(document('concurrent winner')), article.id],
      );
      await blocker.query('COMMIT');
      open = false;
      expect(await pending).toBe(false);
      expect(
        await prisma.newsSearchProjection.findUnique({
          where: { articleId: article.id },
        }),
      ).toBeNull();
    } finally {
      if (open) await blocker.query('ROLLBACK');
      blocker.release();
      await pending;
      await backfill.run();
    }
    expect(await projection(article.id)).toMatchObject({
      sourceVersion: 1,
      publicSearchText: 'concurrent winner gamma',
    });
  });
});
