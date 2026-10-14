/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Security E2E
 * 📄 File: apps/api/test/news-related-audience.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies related summaries obey the same current article eligibility as direct Full News.
 *
 * 🧠 Responsibilities:
 * • checks guest/member audience and publication-state parity through GraphQL;
 * • preserves link ordering, kinds, languages and display-date fallback;
 * • exercises current policy changes without cached or fabricated authorization.
 *
 * 🏗️ Architecture:
 * Real AppModule and migrations in an owned disposable schema; synthetic records only.
 *
 * ⚠️ Important:
 * Editorial link creation uses real permission checks. No database protections are disabled.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import { Permission } from '@api/core/authorization';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsLinksService } from '../src/modules/news/application/services/news-links.service';
import {
  NEWS_ARTICLE_STATUSES,
  type NewsVisibility,
} from '../src/modules/news/domain/types/news-article.type';
import type { NewsInternalLinkType } from '../src/modules/news/domain/types/news-links.type';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type RelatedSummary = {
  id: string;
  type: NewsInternalLinkType;
  anchorText: string;
  language: string;
  slug: string;
  title: string;
  shortText: string;
  coverMediaId: string | null;
  displayPublishedAt: string;
};

describe('Full News related audience (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let author: Awaited<ReturnType<typeof register>>;
  let member: Awaited<ReturnType<typeof register>>;
  const presenceWrites: Promise<void>[] = [];
  const publishedAt = new Date('2026-10-01T12:00:00.000Z');
  const displayAt = new Date('2026-09-30T11:00:00.000Z');

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
    member = await register();
    const permission = await prisma.permission.create({
      data: {
        key: Permission.NewsLinksManage,
        label: 'Synthetic link management',
      },
    });
    await prisma.userPermission.create({
      data: { userId: author.user.id, permissionId: permission.id },
    });
  }, 60000);
  beforeEach(() => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    const anonymous = presence.touchAnonymous.bind(
      presence,
    ) as UserPresenceService['touchAnonymous'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
      presenceWrites.push(pending);
      return pending;
    });
    jest.spyOn(presence, 'touchAnonymous').mockImplementation((...args) => {
      const pending = anonymous(...args);
      presenceWrites.push(pending);
      return pending;
    });
  });
  afterEach(async () => {
    try {
      await Promise.all(presenceWrites.splice(0));
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
      email: 'related-' + id + '@dss.test',
      username: 'related-' + id,
      displayName: 'Related Pilot',
      password: 'synthetic-related-password-123',
    });
  }
  async function article(
    visibility: NewsVisibility = 'PUBLIC',
    language = 'uk',
  ) {
    const marker = 'synthetic-related-' + randomUUID();
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language,
      slug: marker,
      title: marker + ' headline',
      shortText: marker + ' summary',
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
      coverMediaId: null,
    });
    return prisma.newsArticle.update({
      where: { id: draft.id },
      data: { status: 'PUBLISHED', publishedAt, displayPublishedAt: displayAt },
    });
  }
  async function link(
    sourceId: string,
    targetId: string,
    position = 0,
    type: NewsInternalLinkType = 'RELATED',
  ) {
    return app.get(NewsLinksService).create(author.user.id, {
      sourceArticleId: sourceId,
      targetArticleId: targetId,
      position,
      type,
      anchorText: 'synthetic-anchor-' + targetId,
    });
  }
  async function full(slug: string, token?: string, language = 'uk') {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', 'Bearer ' + token);
    const response = await call
      .send({
        query:
          'query($slug:String!,$language:String!){fullNews(language:$language,slug:$slug){id related{id type anchorText language slug title shortText coverMediaId displayPublishedAt}}}',
        variables: { slug, language },
      })
      .expect(200);
    const body = response.body as {
      errors?: { message: string }[];
      data: { fullNews: { id: string; related: RelatedSummary[] } | null };
    };
    expect(body.errors).toBeUndefined();
    return body;
  }
  function expectAbsent(
    response: unknown,
    target: Awaited<ReturnType<typeof article>>,
    linkId: string,
  ) {
    const serialized = JSON.stringify(response);
    for (const value of [
      target.slug,
      target.title,
      target.shortText,
      target.id,
      linkId,
    ])
      expect(serialized).not.toContain(value);
  }

  it('omits every member-only summary and anchor for guests while retaining public links', async () => {
    const source = await article();
    const hidden = await article('MEMBERS');
    const visible = await article();
    const deniedLink = await link(source.id, hidden.id, 0);
    const allowedLink = await link(source.id, visible.id, 1);
    expect((await full(hidden.slug)).data.fullNews).toBeNull();
    const response = await full(source.slug);
    expect(response.data.fullNews?.related.map(({ id }) => id)).toEqual([
      allowedLink.id,
    ]);
    expectAbsent(response, hidden, deniedLink.id);
  });

  it('preserves position/createdAt order, all link kinds, cross-language targets and display dates for members', async () => {
    const source = await article();
    const last = await article('PUBLIC', 'en');
    const first = await article('MEMBERS');
    const second = await article();
    const lastLink = await link(source.id, last.id, 20, 'SERIES');
    const secondLink = await link(source.id, second.id, 10, 'CONTEXTUAL');
    const firstLink = await link(source.id, first.id, 10, 'RELATED');
    // Deterministic tie order, independent of database timestamp resolution.
    await prisma.newsInternalLink.update({
      where: { id: firstLink.id },
      data: { createdAt: new Date('2026-10-01T00:00:00Z') },
    });
    await prisma.newsInternalLink.update({
      where: { id: secondLink.id },
      data: { createdAt: new Date('2026-10-02T00:00:00Z') },
    });
    const response = await full(source.slug, member.tokens.accessToken);
    expect(response.data.fullNews?.related).toEqual(
      (
        [
          [firstLink, first],
          [secondLink, second],
          [lastLink, last],
        ] as const
      ).map(([entry, target]) => ({
        id: entry.id,
        type: entry.type,
        anchorText: entry.anchorText,
        language: target.language,
        slug: target.slug,
        title: target.title,
        shortText: target.shortText,
        coverMediaId: null,
        displayPublishedAt: displayAt.toISOString(),
      })),
    );
    expect(
      (await full(first.slug, member.tokens.accessToken)).data.fullNews?.id,
    ).toBe(first.id);
    expect(
      (await full(source.slug)).data.fullNews?.related.map(({ id }) => id),
    ).toEqual([secondLink.id, lastLink.id]);
  });

  it.each(NEWS_ARTICLE_STATUSES.filter((status) => status !== 'PUBLISHED'))(
    'excludes a currently %s target even for its author and a member',
    async (status) => {
      const source = await article();
      const target = await article();
      const entry = await link(source.id, target.id);
      await prisma.newsArticle.update({
        where: { id: target.id },
        data: { status },
      });
      for (const token of [
        undefined,
        member.tokens.accessToken,
        author.tokens.accessToken,
      ]) {
        expect((await full(target.slug, token)).data.fullNews).toBeNull();
        const response = await full(source.slug, token);
        expect(response.data.fullNews?.related).toEqual([]);
        expectAbsent(response, target, entry.id);
      }
    },
  );

  it('requires a real publication time even if a display date exists', async () => {
    const source = await article();
    const target = await article();
    const entry = await link(source.id, target.id);
    await prisma.newsArticle.update({
      where: { id: target.id },
      data: { publishedAt: null },
    });
    for (const token of [undefined, member.tokens.accessToken]) {
      expect((await full(target.slug, token)).data.fullNews).toBeNull();
      const response = await full(source.slug, token);
      expect(response.data.fullNews?.related).toEqual([]);
      expectAbsent(response, target, entry.id);
    }
  });

  it('retains publication-time fallback when no display date exists', async () => {
    const source = await article();
    const target = await article();
    const entry = await link(source.id, target.id);
    await prisma.newsArticle.update({
      where: { id: target.id },
      data: { displayPublishedAt: null },
    });
    expect((await full(source.slug)).data.fullNews?.related).toEqual([
      expect.objectContaining({
        id: entry.id,
        displayPublishedAt: publishedAt.toISOString(),
      }),
    ]);
  });

  it('observes live visibility changes with the same member JWT and no guest access carry-over', async () => {
    const source = await article();
    const target = await article();
    const entry = await link(source.id, target.id);
    expect((await full(source.slug)).data.fullNews?.related).toHaveLength(1);
    await prisma.newsArticle.update({
      where: { id: target.id },
      data: { visibility: 'MEMBERS' },
    });
    const guest = await full(source.slug);
    expectAbsent(guest, target, entry.id);
    expect(guest.data.fullNews?.related).toEqual([]);
    expect(
      (await full(source.slug, member.tokens.accessToken)).data.fullNews
        ?.related,
    ).toHaveLength(1);
    expect((await full(source.slug)).data.fullNews?.related).toEqual([]);
    await prisma.newsArticle.update({
      where: { id: target.id },
      data: { visibility: 'PUBLIC' },
    });
    expect((await full(source.slug)).data.fullNews?.related).toHaveLength(1);
  });

  it('does not expose public outgoing links through an audience-ineligible source', async () => {
    const source = await article('MEMBERS');
    const target = await article();
    const entry = await link(source.id, target.id);
    const guest = await full(source.slug);
    expect(guest.data.fullNews).toBeNull();
    expectAbsent(guest, target, entry.id);
    expect(
      (await full(source.slug, member.tokens.accessToken)).data.fullNews
        ?.related,
    ).toHaveLength(1);
  });
});
