/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Search Performance E2E
 * 📄 File: apps/api/test/news-search-performance.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Measures the real hybrid search and proves complete pagination beyond 500 matches.
 *
 * 🧠 Responsibilities:
 * • prepares canonical mixed corpora in a migrated disposable schema;
 * • verifies exact public/viewer projection call counts and bounded concurrency;
 * • records latency/memory, owner-evidence reads and public-query plans without timing-only assertions.
 *
 * 🏗️ Architecture:
 * Real AppModule and Editor/ContentAccess policy; bulk writes are synthetic test fixtures only.
 *
 * ⚠️ Important:
 * Local measurements are not a production capacity guarantee. Existing transaction
 * timeouts are unchanged. Never cap the corpus to make a performance test pass.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  createEmptyEditorDocument,
  projectEditorSearchText,
} from '@dss/editor';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PrismaService } from '@api/core/database';
import {
  NEWS_SEARCH_PROJECTOR,
  NEWS_SEARCH_PROJECTION_VERSION,
  type NewsSearchProjector,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsDeliveryService } from '../src/modules/news/application/services/news-delivery.service';
import { EditorContentDeliveryService } from '../src/modules/editor/application/services/editor-content-delivery.service';
import { ContentGateViewerFactsService } from '../src/modules/content-access/application/services/content-gate-viewer-facts.service';
import {
  CONTENT_AUDIENCE_READER,
  type ContentAudienceReader,
} from '../src/modules/content-access/domain/ports/content-audience-reader.interface';
import {
  CONTENT_GATES_REPOSITORY,
  type ContentGatesRepository,
} from '../src/modules/content-access/domain/repositories/content-gates.repository.interface';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import {
  newsSearchEligibility,
  newsSearchMetadataMatch,
} from '../src/modules/news/infrastructure/repositories/news-search-eligibility.sql';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Hybrid News search bounded work and pagination (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let prisma: PrismaService;
  let authorId: string;
  let viewerId: string;
  const corpora = new Map<
    number,
    {
      slug: string;
      ids: string[];
      pinnedIds: string[];
      authorIds: string[];
      authorPinnedIds: string[];
    }
  >();

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
    authorId = await register();
    viewerId = await register();
    for (const size of [250, 1000]) corpora.set(size, await seed(size));
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  async function register() {
    const id = randomUUID();
    return (
      await app.get(AuthenticationPresentationService).register({
        email: 'performance-' + id + '@dss.test',
        username: 'performance-' + id,
        displayName: 'Synthetic Performance Pilot',
        password: 'synthetic-performance-password-123',
      })
    ).user.id;
  }
  async function seed(size: number) {
    const category = await prisma.newsCategory.create({
      data: { name: 'Synthetic mixed corpus', slug: 'perf-' + randomUUID() },
    });
    function sourceFor(articleId: string, gateId: string | null) {
      const document = createEmptyEditorDocument('NEWS');
      document.content.content = gateId
        ? [
            { type: 'paragraph', content: [{ type: 'text', text: 'alpha' }] },
            {
              type: 'contentGate',
              attrs: { gateId },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text:
                        'synthetic private performance payload ' + articleId,
                    },
                  ],
                },
              ],
            },
            { type: 'paragraph', content: [{ type: 'text', text: 'gamma' }] },
            { type: 'paragraph', content: [{ type: 'text', text: articleId }] },
          ]
        : [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'alpha gamma' }],
            },
            { type: 'paragraph', content: [{ type: 'text', text: articleId }] },
          ];
      return document;
    }
    const projector = app.get<NewsSearchProjector>(NEWS_SEARCH_PROJECTOR);
    const ids = Array.from({ length: size }, () => randomUUID());
    for (let offset = 0; offset < size; offset += 100) {
      const entries = ids.slice(offset, offset + 100).map((id, index) => {
        const gateId = (offset + index) % 5 < 3 ? randomUUID() : null;
        return {
          id,
          index: offset + index,
          targetId: randomUUID(),
          gateId,
          source: sourceFor(id, gateId),
        };
      });
      await prisma.$transaction(async (tx) => {
        const gated = entries.flatMap(({ gateId }) => (gateId ? [gateId] : []));
        await tx.contentGate.createMany({
          data: gated.map((id) => ({ id, ownerId: authorId, operator: 'ALL' })),
        });
        await tx.contentGateRequirement.createMany({
          data: gated.map((gateId) => ({
            gateId,
            kind: 'COMMENTS',
            threshold: 100,
          })),
        });
        await tx.interactionTarget.createMany({
          data: entries.map(({ id, targetId }) => ({
            id: targetId,
            kind: 'news.article',
            ownerModule: 'news',
            ownerType: 'NewsArticle',
            ownerId: id,
          })),
        });
        await tx.newsArticle.createMany({
          data: entries.map(({ id, index, targetId, source }) => {
            return {
              id,
              interactionTargetId: targetId,
              authorId,
              status: 'PUBLISHED',
              slug: 'perf-' + id,
              title: 'Synthetic corpus article',
              shortText: 'Synthetic corpus summary',
              document: source as unknown as Prisma.InputJsonValue,
              plainText: projectEditorSearchText(source),
              searchText: projectEditorSearchText(source),
              publishedAt: new Date(1700000000000 + size * 10000 + index),
            };
          }),
        });
        await tx.newsArticleCategory.createMany({
          data: entries.map(({ id }) => ({
            articleId: id,
            categoryId: category.id,
            isPrimary: true,
          })),
        });
        await tx.newsSearchProjection.createMany({
          data: entries.map(({ id, source }) => {
            const evidence = projector.projectPublic(JSON.stringify(source));
            return {
              articleId: id,
              sourceVersion: 1,
              projectionVersion: NEWS_SEARCH_PROJECTION_VERSION,
              publicSearchText: evidence.searchText,
              hasContentGates: evidence.hasContentGates,
            };
          }),
        });
      });
    }
    const descending = [...ids].reverse();
    // Twenty-two qualifying pins prove the existing top-twenty rule is not a result cap.
    await prisma.newsPin.createMany({
      data: descending.slice(0, 22).map((id, index) => ({
        articleId: id,
        scope: index % 2 ? 'CATEGORY' : 'GLOBAL',
        categoryId: index % 2 ? category.id : null,
        pinnedById: authorId,
      })),
    });
    // Expired and category-ineligible pins stay ordinary results.
    const otherCategory = await prisma.newsCategory.create({
      data: {
        name: 'Other synthetic pin scope',
        slug: 'other-' + randomUUID(),
      },
    });
    await prisma.newsPin.createMany({
      data: [
        {
          articleId: descending[22],
          scope: 'GLOBAL',
          expiresAt: new Date(0),
          pinnedById: authorId,
        },
        {
          articleId: descending[23],
          scope: 'CATEGORY',
          categoryId: otherCategory.id,
          pinnedById: authorId,
        },
      ],
    });
    const ungated = new Set(ids.filter((_id, index) => index % 5 >= 3));
    const authorPinnedIds = descending
      .slice(0, 22)
      .filter((id) => ungated.has(id));
    const authorIds = descending.filter(
      (id) => ungated.has(id) && !authorPinnedIds.includes(id),
    );
    return {
      slug: category.slug,
      ids: descending.slice(20),
      pinnedIds: descending.slice(0, 20),
      authorIds,
      authorPinnedIds,
    };
  }

  it.each([250, 1000])(
    'measures %s mixed articles with zero guest projections and exact bounded viewer work',
    async (size) => {
      const corpus = corpora.get(size)!;
      const projector = app.get(EditorContentDeliveryService);
      const real = projector.project.bind(
        projector,
      ) as EditorContentDeliveryService['project'];
      let active = 0;
      let maximum = 0;
      const project = jest
        .spyOn(projector, 'project')
        .mockImplementation(async (...args) => {
          active++;
          maximum = Math.max(maximum, active);
          try {
            return await real(...args);
          } finally {
            active--;
          }
        });
      const service = app.get(NewsDeliveryService);
      const factsRead = jest.spyOn(
        app.get(ContentGateViewerFactsService),
        'read',
      );
      const audienceRead = jest.spyOn(
        app.get<ContentAudienceReader>(CONTENT_AUDIENCE_READER),
        'read',
      );
      const definitionRead = jest.spyOn(
        app.get<ContentGatesRepository>(CONTENT_GATES_REPOSITORY),
        'findById',
      );
      const samples: {
        lane: string;
        p50Ms: number;
        p95Ms: number;
        heapDeltaBytes: number;
        rssDeltaBytes: number;
        projectionCalls: number;
        maximumConcurrency: number;
        viewerFactsReads: number;
        audienceReads: number;
        gateDefinitionReads: number;
      }[] = [];
      for (const lane of ['guest', 'member']) {
        project.mockClear();
        factsRead.mockClear();
        audienceRead.mockClear();
        definitionRead.mockClear();
        maximum = 0;
        const before = process.memoryUsage();
        const timings: number[] = [];
        for (let run = 0; run < 5; run++) {
          const start = performance.now();
          const page = await service.browseNumbered(
            { categorySlug: corpus.slug, search: 'alpha gamma', pageSize: 100 },
            lane === 'member' ? viewerId : undefined,
          );
          timings.push(performance.now() - start);
          expect(page.total).toBe(size - 20);
          expect(page.items.map(({ id }) => id)).toEqual(
            corpus.ids.slice(0, 100),
          );
          expect(page.pinnedItems.map(({ id }) => id)).toEqual(
            corpus.pinnedIds,
          );
        }
        expect(project).toHaveBeenCalledTimes(lane === 'guest' ? 0 : size * 3);
        expect(maximum).toBeLessThanOrEqual(4);
        expect(active).toBe(0);
        const batches =
          lane === 'guest' ? 0 : Math.ceil((size * 3) / 5 / 64) * 5;
        expect(factsRead.mock.calls.length).toBe(batches);
        expect(audienceRead.mock.calls.length).toBe(batches);
        expect(definitionRead.mock.calls.length).toBe(
          lane === 'guest' ? 0 : size * 3,
        );
        const after = process.memoryUsage();
        timings.sort((a, b) => a - b);
        samples.push({
          lane,
          p50Ms: Math.round(timings[2]),
          p95Ms: Math.round(timings[4]),
          heapDeltaBytes: after.heapUsed - before.heapUsed,
          rssDeltaBytes: after.rss - before.rss,
          projectionCalls: project.mock.calls.length,
          maximumConcurrency: maximum,
          viewerFactsReads: factsRead.mock.calls.length,
          audienceReads: audienceRead.mock.calls.length,
          gateDefinitionReads: definitionRead.mock.calls.length,
        });
      }
      console.info(
        'DEBT-053 local performance',
        JSON.stringify({
          articles: size,
          gatedArticles: (size * 3) / 5,
          samples,
        }),
      );
      const input = { categorySlug: corpus.slug };
      const plan = await prisma.$queryRaw<
        { 'QUERY PLAN': string }[]
      >(Prisma.sql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT a."id" FROM "news_articles" a JOIN "news_search_projections" p ON p."articleId" = a."id"
      WHERE ${newsSearchEligibility(input)} AND (${newsSearchMetadataMatch('alpha gamma')}
        OR p."publicSearchText" ILIKE '%alpha gamma%')
    `);
      expect(plan.length).toBeGreaterThan(0);
      expect(plan.map((row) => row['QUERY PLAN']).join('\n')).not.toContain(
        'synthetic private performance payload',
      );
      console.info(
        'DEBT-053 public plan',
        JSON.stringify({
          articles: size,
          plan: plan.map((row) => row['QUERY PLAN']),
        }),
      );
    },
    60000,
  );

  it('returns correct numbered/cursor pages beyond 500 results without losing the remaining qualifying pins', async () => {
    const corpus = corpora.get(1000)!;
    const service = app.get(NewsDeliveryService);
    const filters = { categorySlug: corpus.slug, search: 'alpha gamma' };
    const numbered = await service.browseNumbered(
      { ...filters, page: 6, pageSize: 100 },
      viewerId,
    );
    expect(numbered.total).toBe(980);
    expect(numbered.totalPages).toBe(10);
    expect(numbered.items.map(({ id }) => id)).toEqual(
      corpus.ids.slice(500, 600),
    );
    const last = await service.browseNumbered({
      ...filters,
      page: 10,
      pageSize: 100,
    });
    expect(last.items.map(({ id }) => id)).toEqual(corpus.ids.slice(900));
    const first = await service.browseShort(
      { ...filters, first: 37 },
      viewerId,
    );
    const second = await service.browseShort(
      { ...filters, first: 37, after: first.endCursor! },
      viewerId,
    );
    expect(first.items.map(({ id }) => id)).toEqual(corpus.ids.slice(0, 37));
    expect(second.items.map(({ id }) => id)).toEqual(corpus.ids.slice(37, 74));
    expect(second.pinnedItems.map(({ id }) => id)).toEqual(corpus.pinnedIds);
    expect(first.hasNextPage).toBe(true);
    expect(second.hasNextPage).toBe(true);
    const finalSource = await prisma.newsArticle.findUniqueOrThrow({
      where: { id: corpus.ids[949] },
    });
    const after = Buffer.from(
      JSON.stringify({
        id: finalSource.id,
        publishedAt: finalSource.publishedAt!.toISOString(),
      }),
    ).toString('base64url');
    const tail = await service.browseShort({ ...filters, first: 37, after });
    expect(tail.items.map(({ id }) => id)).toEqual(corpus.ids.slice(950));
    expect(tail.hasNextPage).toBe(false);
    expect(first.items.slice(0, 2).map(({ id }) => id)).toEqual(
      corpus.ids.slice(0, 2),
    );
  }, 30000);

  it('keeps two concurrent viewer snapshots and batch scopes separate without raising transaction timeouts', async () => {
    const corpus = corpora.get(1000)!;
    const service = app.get(NewsDeliveryService);
    const filters = {
      categorySlug: corpus.slug,
      search: 'alpha gamma',
      pageSize: 100,
    };
    const [member, author] = await Promise.all([
      service.browseNumbered(filters, viewerId),
      service.browseNumbered(filters, authorId),
    ]);
    expect(member.total).toBe(980);
    expect(member.items.map(({ id }) => id)).toEqual(corpus.ids.slice(0, 100));
    expect(member.pinnedItems.map(({ id }) => id)).toEqual(corpus.pinnedIds);
    expect(author.total).toBe(corpus.authorIds.length);
    expect(author.items.map(({ id }) => id)).toEqual(
      corpus.authorIds.slice(0, 100),
    );
    expect(author.pinnedItems.map(({ id }) => id)).toEqual(
      corpus.authorPinnedIds,
    );
  }, 15000);

  it('fails the whole result if a later gated batch loses access evidence and recovers on the next request', async () => {
    const corpus = corpora.get(1000)!;
    const audience = app.get<ContentAudienceReader>(CONTENT_AUDIENCE_READER);
    const real = audience.read.bind(audience) as ContentAudienceReader['read'];
    const read = jest
      .spyOn(audience, 'read')
      .mockImplementationOnce(real)
      .mockRejectedValueOnce(
        new Error('Synthetic private provider diagnostic'),
      );
    const service = app.get(NewsDeliveryService);
    const filters = {
      categorySlug: corpus.slug,
      search: 'alpha gamma',
      pageSize: 100,
    };
    await expect(service.browseNumbered(filters, viewerId)).rejects.toEqual(
      new Error('News search projection is unavailable.'),
    );
    expect(read).toHaveBeenCalledTimes(2);
    read.mockRestore();
    expect((await service.browseNumbered(filters, viewerId)).total).toBe(980);
  }, 15000);
});
