/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery Snapshot E2E
 * 📄 File: apps/api/test/news-owned-snapshot.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies actual root read composition remains coherent across independently committed owner edits.
 *
 * 🧠 Responsibilities:
 * • interleaves real writers at deterministic owner boundaries, without sleeps;
 * • verifies page/full/vote/comment snapshots, failure propagation and fresh subsequent reads;
 * • measures actual SQL shape and batching for one versus ten distinct authors.
 *
 * 🏗️ Architecture:
 * Real migrated AppModule, owned disposable schema and actual owner adapters.
 *
 * ⚠️ Important:
 * Timing spies call actual persistence; only explicit failure/missing-evidence cases fabricate denials.
 * No authorization success mock, global isolation change, timeout extension or trigger bypass.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import {
  NEWS_DELIVERY_READER,
  type NewsDeliveryReader,
} from '../src/modules/news/domain/ports/news-delivery-reader.interface';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { PrismaPublicProfileReader } from '../src/modules/users/infrastructure/repositories/prisma-public-profile.reader';
import { PrismaInteractionDeliveryReader } from '../src/modules/interactions/infrastructure/repositories/prisma-interaction-delivery.reader';
import { ReactionsService } from '../src/modules/interactions/application/services/reactions.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('News owned snapshot (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let reader: NewsDeliveryReader;
  let profiles: PrismaPublicProfileReader;
  let interactions: PrismaInteractionDeliveryReader;
  let author: Awaited<ReturnType<typeof register>>;
  let member: Awaited<ReturnType<typeof register>>;
  let batchCategory: string;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    reader = app.get<NewsDeliveryReader>(NEWS_DELIVERY_READER);
    profiles = app.get(PrismaPublicProfileReader);
    interactions = app.get(PrismaInteractionDeliveryReader);
    author = await register();
    member = await register();
    batchCategory = (await category()).slug;
    for (let index = 0; index < 10; index++) {
      const pilot = await register();
      await article(pilot.user.id, batchCategory);
    }
  }, 60000);
  beforeEach(async () => {
    await prisma.user.updateMany({
      where: { id: { in: [author.user.id, member.user.id] } },
      data: { displayName: 'before' },
    });
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      email: 'snapshot-' + id + '@dss.test',
      username: 'snapshot-' + id,
      displayName: 'before',
      password: 'synthetic-snapshot-password-123',
    });
  }
  function category() {
    return prisma.newsCategory.create({
      data: { name: 'Synthetic snapshot', slug: 'snapshot-' + randomUUID() },
    });
  }
  async function article(authorId = author.user.id, categorySlug?: string) {
    const group = categorySlug
      ? await prisma.newsCategory.findUniqueOrThrow({
          where: { slug: categorySlug },
        })
      : await category();
    const post = await app.get(NewsService).createDraft({
      authorId,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'snapshot-' + randomUUID(),
      title: 'Synthetic snapshot before',
      shortText: 'Synthetic summary',
      coverMediaId: null,
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
    });
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categories: { create: { categoryId: group.id, isPrimary: true } },
      },
    });
    await app
      .get(ReactionsService)
      .set(member.user.id, post.interactionTargetId, 'UPVOTE');
    return { ...post, categorySlug: group.slug };
  }
  async function writeGeneration(
    post: Awaited<ReturnType<typeof article>>,
    withShare = false,
  ) {
    await prisma.$transaction(async (transaction) => {
      await transaction.newsArticle.update({
        where: { id: post.id },
        data: { title: 'Synthetic snapshot after' },
      });
      await transaction.user.update({
        where: { id: post.authorId },
        data: { displayName: 'after' },
      });
      await transaction.reactionAggregate.update({
        where: { interactionTargetId: post.interactionTargetId },
        data: { score: 7, upvotes: 7, total: 7 },
      });
      if (withShare)
        await transaction.interactionShare.create({
          data: {
            interactionTargetId: post.interactionTargetId,
            actorId: member.user.id,
            viewerKey: randomUUID(),
            channel: 'X',
          },
        });
    });
  }

  it.each(['cursor', 'numbered', 'search-cursor', 'search-numbered'] as const)(
    'keeps %s content, display and engagement in one snapshot across a committed writer',
    async (operation) => {
      const post = await article();
      const filters = {
        categorySlug: post.categorySlug,
        ...(operation.startsWith('search') ? { search: 'snapshot' } : {}),
      };
      const read = () =>
        operation.endsWith('numbered')
          ? reader.browseShortNumbered({ ...filters, page: 1, pageSize: 10 })
          : reader.browseShort({ ...filters, first: 10 });
      const actual = profiles.read.bind(
        profiles,
      ) as PrismaPublicProfileReader['read'];
      jest
        .spyOn(profiles, 'read')
        .mockImplementationOnce(async (transaction, ids) => {
          await writeGeneration(post);
          return actual(transaction, ids);
        });
      const before = await read();
      expect(before.items).toHaveLength(1);
      expect(before.items[0]).toMatchObject({
        id: post.id,
        title: post.title,
        author: { displayName: 'before' },
        engagement: { upvotes: 1, score: 1 },
      });
      const after = await read();
      expect(after.items[0]).toMatchObject({
        title: 'Synthetic snapshot after',
        author: { displayName: 'after' },
        engagement: { score: 7 },
      });
      expect(
        (await prisma.newsArticle.findUniqueOrThrow({ where: { id: post.id } }))
          .title,
      ).toBe('Synthetic snapshot after');
    },
  );
  it('keeps Full News display, engagement and later share groups in its first snapshot', async () => {
    const post = await article();
    const actual = profiles.read.bind(
      profiles,
    ) as PrismaPublicProfileReader['read'];
    jest
      .spyOn(profiles, 'read')
      .mockImplementationOnce(async (transaction, ids) => {
        await writeGeneration(post, true);
        return actual(transaction, ids);
      });
    const before = await reader.findFullBySlug('uk', post.slug);
    expect(before).toMatchObject({
      title: post.title,
      author: { displayName: 'before' },
      engagement: { score: 1 },
      sharing: { total: 0 },
    });
    const after = await reader.findFullBySlug('uk', post.slug);
    expect(after).toMatchObject({
      title: 'Synthetic snapshot after',
      author: { displayName: 'after' },
      engagement: { score: 7 },
      sharing: { total: 1 },
    });
    expect(
      after?.sharing.channels.find(({ channel }) => channel === 'X')?.count,
    ).toBe(1);
  });
  it('keeps vote rows and actor display together; the next request rechecks changed article visibility', async () => {
    const post = await article();
    const actual = profiles.read.bind(
      profiles,
    ) as PrismaPublicProfileReader['read'];
    jest
      .spyOn(profiles, 'read')
      .mockImplementationOnce(async (transaction, ids) => {
        await prisma.$transaction([
          prisma.newsArticle.update({
            where: { id: post.id },
            data: { visibility: 'MEMBERS' },
          }),
          prisma.user.update({
            where: { id: member.user.id },
            data: { displayName: 'after' },
          }),
          prisma.reaction.updateMany({
            where: {
              actorId: member.user.id,
              interactionTargetId: post.interactionTargetId,
            },
            data: { kind: 'DOWNVOTE' },
          }),
        ]);
        return actual(transaction, ids);
      });
    expect((await reader.ratingVotes(post.id, 1, 20)).items[0]).toMatchObject({
      kind: 'UPVOTE',
      actor: { displayName: 'before' },
    });
    expect(await reader.ratingVotes(post.id, 1, 20)).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    expect(
      (await reader.ratingVotes(post.id, 1, 20, member.user.id)).items[0],
    ).toMatchObject({ kind: 'DOWNVOTE', actor: { displayName: 'after' } });
  });
  it('keeps comment roots, totals, bodies and display at the eligibility snapshot', async () => {
    const post = await article();
    const comments = app.get(CommentsService);
    const initial = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic before' },
    );
    const actual = interactions.commentsPage.bind(
      interactions,
    ) as PrismaInteractionDeliveryReader['commentsPage'];
    jest
      .spyOn(interactions, 'commentsPage')
      .mockImplementationOnce(async (transaction, ...args) => {
        await comments.create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic after',
        });
        await prisma.user.update({
          where: { id: author.user.id },
          data: { displayName: 'after' },
        });
        return actual(transaction, ...args);
      });
    const before = await reader.comments(post.id, 1, 20);
    expect(before.total).toBe(1);
    expect(before.items).toHaveLength(1);
    expect(before.items[0]).toMatchObject({
      id: initial.id,
      body: 'Synthetic before',
      author: { displayName: 'before' },
    });
    const after = await reader.comments(post.id, 1, 20);
    expect(after.total).toBe(2);
    expect(
      after.items.every(
        ({ author: profile }) => profile.displayName === 'after',
      ),
    ).toBe(true);
  });
  it('batches ten distinct authors with actual SQL work independent of page author count', async () => {
    const actual = profiles.read.bind(
      profiles,
    ) as PrismaPublicProfileReader['read'];
    const profilesRead = jest
      .spyOn(profiles, 'read')
      .mockImplementation(async (transaction, ids) => {
        const [isolation] = await transaction.$queryRaw<
          { transaction_isolation: string }[]
        >`SHOW transaction_isolation`;
        expect(isolation.transaction_isolation).toBe('repeatable read');
        return actual(transaction, ids);
      });
    const engagementRead = jest.spyOn(interactions, 'summaries');
    const measure = async (first: number) => {
      fixture.queries.length = 0;
      const page = await reader.browseShort({
        first,
        categorySlug: batchCategory,
      });
      const selects = fixture.queries.filter((sql) => /^SELECT\b/i.test(sql));
      const userQueries = selects.filter((sql) =>
        /FROM\s+(?:"[^"]+"\.)?"users"/i.test(sql),
      );
      expect(userQueries).toHaveLength(1);
      for (const field of [
        'passwordHash',
        'refreshTokenHash',
        'email',
        'authVersion',
        'status',
      ])
        expect(userQueries[0]).not.toContain('"' + field + '"');
      return { page, count: selects.length };
    };
    const small = await measure(1);
    const large = await measure(10);
    expect(small.page.items).toHaveLength(1);
    expect(
      new Set(large.page.items.map(({ author: profile }) => profile.id)).size,
    ).toBe(10);
    expect(large.count).toBe(small.count);
    expect(profilesRead).toHaveBeenCalledTimes(2);
    expect(engagementRead).toHaveBeenCalledTimes(2);
    console.info(
      'Snapshot SQL SELECT count: one author=' +
        small.count +
        ', ten authors=' +
        large.count,
    );
  });
  it('does not hydrate an empty page or fabricate missing owner evidence', async () => {
    const display = jest.spyOn(profiles, 'read');
    const engagement = jest.spyOn(interactions, 'summaries');
    const page = await reader.browseShort({
      first: 10,
      categorySlug: 'synthetic-missing',
    });
    expect(page.items).toEqual([]);
    expect(display).not.toHaveBeenCalled();
    expect(engagement).not.toHaveBeenCalled();
    display.mockResolvedValueOnce(new Map());
    await expect(
      reader.browseShort({ first: 10, categorySlug: batchCategory }),
    ).rejects.toThrow('owner evidence is incomplete');
  });
  it('rejects missing interaction evidence rather than synthesizing zero engagement', async () => {
    jest.spyOn(interactions, 'summaries').mockResolvedValueOnce(new Map());
    await expect(
      reader.browseShort({ first: 10, categorySlug: batchCategory }),
    ).rejects.toThrow('owner evidence is incomplete');
  });
  it.each(['profile', 'summary', 'shares', 'votes', 'comments'] as const)(
    'propagates %s owner failure without returning a partial response',
    async (owner) => {
      const post = await article();
      const error = new Error('Synthetic owner unavailable');
      let read: () => Promise<unknown>;
      if (owner === 'profile') {
        jest.spyOn(profiles, 'read').mockRejectedValueOnce(error);
        read = () =>
          reader.browseShort({ first: 10, categorySlug: post.categorySlug });
      } else if (owner === 'summary') {
        jest.spyOn(interactions, 'summaries').mockRejectedValueOnce(error);
        read = () =>
          reader.browseShort({ first: 10, categorySlug: post.categorySlug });
      } else if (owner === 'shares') {
        jest.spyOn(interactions, 'shares').mockRejectedValueOnce(error);
        read = () => reader.findFullBySlug('uk', post.slug);
      } else if (owner === 'votes') {
        jest.spyOn(interactions, 'ratingPage').mockRejectedValueOnce(error);
        read = () => reader.ratingVotes(post.id, 1, 20);
      } else {
        jest.spyOn(interactions, 'commentsPage').mockRejectedValueOnce(error);
        read = () => reader.comments(post.id, 1, 20);
      }
      await expect(read()).rejects.toBe(error);
      await expect(read()).resolves.toBeDefined();
    },
  );
  it('rolls back the search match relation after owner hydration failure and succeeds on the next request', async () => {
    const post = await article();
    const read = () =>
      reader.browseShort({
        first: 10,
        categorySlug: post.categorySlug,
        search: 'snapshot',
      });
    jest
      .spyOn(profiles, 'read')
      .mockRejectedValueOnce(new Error('Synthetic profile store failure'));
    await expect(read()).rejects.toThrow('profile store failure');
    const [remaining] = await prisma.$queryRaw<
      { count: number }[]
    >`SELECT COUNT(*)::integer AS count FROM pg_class WHERE relname = 'dss_news_search_matches' AND relpersistence = 't'`;
    expect(remaining.count).toBe(0);
    expect((await read()).items[0].id).toBe(post.id);
  });
});
