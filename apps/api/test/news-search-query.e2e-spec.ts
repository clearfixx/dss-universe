/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Search Security E2E
 * 📄 File: apps/api/test/news-search-query.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies live News search responses against canonical visibility and current access decisions.
 *
 * 🧠 Responsibilities:
 * • exercises actual GraphQL totals/pins and cursor reads through root composition;
 * • checks non-monotonic phrases, membership lifecycle and fail-closed outages;
 * • verifies snapshot consistency and persistence-filter equivalence.
 *
 * 🏗️ Architecture:
 * Real AppModule, all migrations, disposable owned schema and synthetic content only.
 *
 * ⚠️ Important:
 * Successful access uses real policy. Test spies observe calls or inject failures,
 * never substitute a successful permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyEditorDocument, type EditorNode } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
} from '@api/modules/content-access';
import {
  NEWS_SEARCH_PROJECTOR,
  type NewsSearchProjector,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsDeliveryService } from '../src/modules/news/application/services/news-delivery.service';
import { NewsSearchBackfillService } from '../src/modules/news/application/services/news-search-backfill.service';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { AccessGroupsService } from '../src/modules/iam/access-groups/application/access-groups.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Viewer-safe live News search (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let author: Awaited<ReturnType<typeof register>>;
  let viewer: Awaited<ReturnType<typeof register>>;
  let category: { id: string; slug: string };
  const pendingPresence: Promise<void>[] = [];
  const secret = 'synthetic-private-search-marker';
  const paragraph = (text: string): EditorNode => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  });

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
    app.setGlobalPrefix('api');
    await app.init();
    author = await register();
    viewer = await register();
    const permission = await prisma.permission.create({
      data: { key: 'permissions.manage', label: 'Synthetic group management' },
    });
    await prisma.userPermission.create({
      data: { userId: author.user.id, permissionId: permission.id },
    });
  }, 60000);

  beforeEach(async () => {
    category = await prisma.newsCategory.create({
      data: { slug: 'search-' + randomUUID(), name: 'Synthetic search scope' },
    });
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    const anonymous = presence.touchAnonymous.bind(
      presence,
    ) as UserPresenceService['touchAnonymous'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const result = touch(...args);
      pendingPresence.push(result);
      return result;
    });
    jest.spyOn(presence, 'touchAnonymous').mockImplementation((...args) => {
      const result = anonymous(...args);
      pendingPresence.push(result);
      return result;
    });
  });
  afterEach(async () => {
    try {
      await Promise.all(pendingPresence.splice(0));
    } finally {
      jest.restoreAllMocks();
    }
  });
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      email: 'query-' + id + '@dss.test',
      username: 'query-' + id,
      displayName: 'Synthetic Search Pilot',
      password: 'synthetic-query-password-123',
    });
  }
  async function gate(groupKey?: string, threshold = 100) {
    const result = await app.get(ContentGatesService).create({
      ownerId: author.user.id,
      operator: 'ALL',
      requirements: [
        ...(groupKey
          ? [
              {
                kind: 'GROUP' as const,
                groupKey: 'group:' + groupKey,
                threshold: null,
              },
            ]
          : []),
        { kind: 'COMMENTS', threshold, groupKey: null },
      ],
    });
    return {
      type: 'contentGate',
      attrs: { gateId: result.id },
      content: [paragraph(secret)],
    } satisfies EditorNode;
  }
  async function article(
    nodes: EditorNode[],
    title = 'Synthetic public headline',
  ) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = nodes;
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      language: 'uk',
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      slug: 'query-' + randomUUID(),
      title,
      shortText: 'Synthetic public summary',
      documentJson: JSON.stringify(document),
      coverMediaId: null,
    });
    await prisma.newsArticle.update({
      where: { id: draft.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categories: { create: { categoryId: category.id, isPrimary: true } },
      },
    });
    return draft;
  }
  async function search(
    text?: string,
    token?: string,
    extra: Record<string, unknown> = {},
  ) {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', 'Bearer ' + token);
    const response = await call
      .send({
        query:
          'query($input:NewsBrowseInput!){news(input:$input){total totalPages page items{id title} pinnedItems{id title}}}',
        variables: {
          input: {
            categorySlug: category.slug,
            search: text,
            pageSize: 100,
            ...extra,
          },
        },
      })
      .expect(200);
    return response.body as {
      errors?: { message: string }[];
      data: {
        news: {
          total: number;
          totalPages: number;
          page: number;
          items: { id: string; title: string }[];
          pinnedItems: { id: string; title: string }[];
        };
      } | null;
    };
  }
  function result(response: Awaited<ReturnType<typeof search>>) {
    expect(response.errors).toBeUndefined();
    return response.data!.news;
  }
  async function grant(groupId: string, expired = false) {
    return app.get(AccessGroupsService).grant(author.user.id, {
      groupId,
      subjectId: viewer.user.id,
      validFrom: new Date(Date.now() - 60000),
      validUntil: expired ? new Date(Date.now() - 30000) : null,
    });
  }

  it('keeps hidden-only guest matches out of pins, items and total without policy calls', async () => {
    const post = await article([
      paragraph('alpha'),
      await gate(),
      paragraph('gamma'),
    ]);
    await prisma.newsPin.create({
      data: { articleId: post.id, scope: 'GLOBAL', pinnedById: author.user.id },
    });
    const decisions = jest.spyOn(
      app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS),
      'evaluate',
    );
    expect(result(await search(secret))).toMatchObject({
      total: 0,
      totalPages: 0,
      items: [],
      pinnedItems: [],
    });
    expect(
      result(await search('alpha gamma')).pinnedItems.map(({ id }) => id),
    ).toEqual([post.id]);
    expect(decisions).not.toHaveBeenCalled();
    expect(result(await search()).pinnedItems.map(({ id }) => id)).toEqual([
      post.id,
    ]);
  });

  it('matches denied cross-block phrases but rechecks public body shortcuts when an author can see the gate', async () => {
    const post = await article([
      paragraph('alpha'),
      await gate(),
      paragraph('gamma'),
    ]);
    expect(
      result(await search('alpha gamma', viewer.tokens.accessToken)).items.map(
        ({ id }) => id,
      ),
    ).toEqual([post.id]);
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      0,
    );
    expect(
      result(await search('alpha gamma', author.tokens.accessToken)).total,
    ).toBe(0);
    expect(
      result(await search(secret, author.tokens.accessToken)).items.map(
        ({ id }) => id,
      ),
    ).toEqual([post.id]);
  });

  it('keeps GROUP mandatory for Premium/author and observes grants, revocation and expiry on new requests', async () => {
    const groups = app.get(AccessGroupsService);
    const group = await groups.create(author.user.id, {
      key: 'query-' + randomUUID(),
      displayName: 'Synthetic audience',
      capabilities: [],
    });
    const premium = await prisma.accessGroup.findUniqueOrThrow({
      where: { key: 'premium' },
    });
    await article([await gate(group.key)]);
    const paid = await grant(premium.id);
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      0,
    );
    expect(result(await search(secret, author.tokens.accessToken)).total).toBe(
      0,
    );
    const member = await grant(group.id);
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      1,
    );
    await groups.revoke(
      author.user.id,
      paid.id,
      'Synthetic Premium revocation',
    );
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      0,
    );
    await grant(premium.id);
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      1,
    );
    await groups.revoke(
      author.user.id,
      member.id,
      'Synthetic audience revocation',
    );
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      0,
    );
    await grant(group.id, true);
    expect(result(await search(secret, viewer.tokens.accessToken)).total).toBe(
      0,
    );
  });

  it('accepts public metadata matches without reading gated documents or calling unavailable policy', async () => {
    const post = await article([await gate()], 'definitive-metadata-marker');
    const project = jest.spyOn(
      app.get<NewsSearchProjector>(NEWS_SEARCH_PROJECTOR),
      'projectForViewer',
    );
    jest
      .spyOn(app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS), 'evaluate')
      .mockRejectedValue(new Error(secret));
    expect(
      result(
        await search('definitive-metadata-marker', viewer.tokens.accessToken),
      ).items.map(({ id }) => id),
    ).toEqual([post.id]);
    expect(project).not.toHaveBeenCalled();
  });

  it('rejects the whole operation on policy failure without returning partial counts or protected diagnostics', async () => {
    await article([paragraph('alpha'), await gate()]);
    await article([paragraph('alpha')]);
    const outage = jest
      .spyOn(app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS), 'evaluate')
      .mockRejectedValue(new Error(secret));
    const response = await search('alpha', viewer.tokens.accessToken);
    expect(response.errors?.[0].message).toBe(
      'News search projection is unavailable.',
    );
    expect(response.data).toBeNull();
    expect(JSON.stringify(response)).not.toContain(secret);
    outage.mockRestore();
    expect(result(await search('alpha', viewer.tokens.accessToken)).total).toBe(
      2,
    );
  });

  it.each(['missing', 'source', 'algorithm'] as const)(
    'fails closed on %s index evidence and recovers after canonical backfill',
    async (kind) => {
      const post = await article([paragraph('alpha')]);
      if (kind === 'missing')
        await prisma.newsSearchProjection.delete({
          where: { articleId: post.id },
        });
      else
        await prisma.newsSearchProjection.update({
          where: { articleId: post.id },
          data:
            kind === 'source'
              ? { sourceVersion: 99 }
              : { projectionVersion: 99 },
        });
      const response = await search('alpha');
      expect(response.errors?.[0].message).toBe(
        'News search index requires maintenance.',
      );
      expect(response.data).toBeNull();
      expect(result(await search()).total).toBe(1);
      await app.get(NewsSearchBackfillService).run(7);
      expect(result(await search('alpha')).total).toBe(1);
    },
  );

  it('preserves database wildcard, escape, quote and Unicode comparison semantics', async () => {
    await article([paragraph("alpha a_b a\\b O'Reilly σος 𐳀 outline")]);
    const row = await prisma.newsSearchProjection.findFirstOrThrow({
      where: { article: { categories: { some: { categoryId: category.id } } } },
    });
    for (const expression of [
      '%',
      '_',
      'a\\_b',
      'a\\\\b',
      "O'Reilly",
      'ΣΟΣ',
      '𐳀',
      'absent',
    ]) {
      const expected = await prisma.newsSearchProjection.count({
        where: {
          articleId: row.articleId,
          publicSearchText: { contains: expression, mode: 'insensitive' },
        },
      });
      expect(result(await search(expression)).total).toBe(expected);
    }
  });

  it('preserves publication, audience, language, post type, category, tag, featured and homepage filters', async () => {
    const post = await article([paragraph('filter-marker')]);
    const tag = await prisma.newsTag.create({
      data: { slug: 'tag-' + randomUUID(), name: 'Synthetic tag' },
    });
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: {
        featured: true,
        showOnHomepage: false,
        tags: { create: { tagId: tag.id } },
      },
    });
    for (const filters of [
      { language: 'uk' },
      { postType: 'STANDARD' },
      { tagSlug: tag.slug },
      { featured: true },
      { homepage: false },
    ])
      expect(
        result(await search('filter-marker', undefined, filters)).total,
      ).toBe(1);
    for (const filters of [
      { language: 'en' },
      { postType: 'AUDIO' },
      { tagSlug: 'absent' },
      { featured: false },
      { homepage: true },
      { categorySlug: 'absent' },
    ])
      expect(
        result(await search('filter-marker', undefined, filters)).total,
      ).toBe(0);
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { visibility: 'MEMBERS' },
    });
    expect(result(await search('filter-marker')).total).toBe(0);
    expect(
      result(await search('filter-marker', viewer.tokens.accessToken)).total,
    ).toBe(1);
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { status: 'DRAFT' },
    });
    expect(
      result(await search('filter-marker', viewer.tokens.accessToken)).total,
    ).toBe(0);
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: null },
    });
    expect(
      result(await search('filter-marker', viewer.tokens.accessToken)).total,
    ).toBe(0);
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { publishedAt: new Date() },
    });
    await prisma.newsCategory.update({
      where: { id: category.id },
      data: { isActive: false },
    });
    expect(
      result(await search('filter-marker', viewer.tokens.accessToken)).total,
    ).toBe(0);
  });

  it('retains one article/index/pin/hydration snapshot during a concurrent publication and source edit', async () => {
    const post = await article([paragraph('alpha'), await gate()]);
    await prisma.newsPin.create({
      data: { articleId: post.id, scope: 'GLOBAL', pinnedById: author.user.id },
    });
    const projector = app.get<NewsSearchProjector>(NEWS_SEARCH_PROJECTOR);
    const project = projector.projectForViewer.bind(
      projector,
    ) as NewsSearchProjector['projectForViewer'];
    let reached!: () => void;
    let release!: () => void;
    const observed = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest
      .spyOn(projector, 'projectForViewer')
      .mockImplementation(async (...args) => {
        reached();
        await resume;
        return project(...args);
      });
    const searching = app
      .get(NewsDeliveryService)
      .browseNumbered(
        { categorySlug: category.slug, search: 'alpha' },
        viewer.user.id,
      );
    try {
      await observed;
      const next = createEmptyEditorDocument('NEWS');
      next.content.content = [paragraph('changed')];
      await prisma.newsArticle.update({
        where: { id: post.id },
        data: {
          status: 'DRAFT',
          title: 'changed',
          document: JSON.parse(JSON.stringify(next)) as object,
          currentVersion: 2,
        },
      });
      await prisma.newsPin.delete({ where: { articleId: post.id } });
    } finally {
      release();
    }
    const page = await searching;
    expect(page.total).toBe(0);
    expect(page.pinnedItems.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: post.id, title: post.title },
    ]);
    expect(result(await search('alpha', viewer.tokens.accessToken)).total).toBe(
      0,
    );
  });
});
