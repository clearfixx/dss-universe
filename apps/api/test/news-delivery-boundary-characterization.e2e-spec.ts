/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery Boundary E2E
 * 📄 File: apps/api/test/news-delivery-boundary-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Establishes current News secondary-read behavior and database snapshot facts before ownership transfer.
 *
 * 🧠 Responsibilities:
 * • guards guest MEMBERS comments/votes and characterizes valid tombstone transport;
 * • contrasts sequential Read Committed and Repeatable Read using a committed external writer;
 * • preserves synthetic-only data and real root authorization/normalization.
 *
 * 🏗️ Architecture:
 * Test-only AppModule over an owned migrated schema; no production implementation change.
 *
 * ⚠️ Important:
 * Tombstone transport follows the owner-approved nullable DEBT-057 contract.
 * Isolation probes establish DB behavior, not a migrated production read contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { ReactionsService } from '../src/modules/interactions/application/services/reactions.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type GuestResponse = {
  errors?: { message: string }[];
  data: {
    fullNews?: { id: string } | null;
    newsComments?: {
      total: number;
      items: {
        id: string;
        body: string | null;
        documentJson: string | null;
        isDeleted: boolean;
      }[];
    };
    newsRatingVotes?: {
      total: number;
      items: { actor: { id: string; username: string } }[];
    };
  } | null;
};

describe('News delivery pre-transfer characterization (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let author: Awaited<ReturnType<typeof register>>;
  let voter: Awaited<ReturnType<typeof register>>;
  const presenceWrites: Promise<void>[] = [];
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
    voter = await register();
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
      email: 'delivery-' + id + '@dss.test',
      username: 'delivery-' + id,
      displayName: 'Synthetic Delivery Pilot',
      password: 'synthetic-delivery-password-123',
    });
  }
  async function article(visibility: 'PUBLIC' | 'MEMBERS' = 'PUBLIC') {
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language: 'uk',
      slug: 'delivery-' + randomUUID(),
      title: 'Synthetic delivery title',
      shortText: 'Synthetic public summary',
      coverMediaId: null,
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
    });
    await prisma.newsArticle.update({
      where: { id: draft.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return draft;
  }
  async function guest(
    query: string,
    post: Awaited<ReturnType<typeof article>>,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query, variables: { id: post.id, slug: post.slug } })
      .expect(200);
    return response.body as GuestResponse;
  }
  const commentsQuery =
    'query($id:ID!,$slug:String!){fullNews(language:"uk",slug:$slug){id} newsComments(articleId:$id){total items{id body documentJson isDeleted}}}';

  it('denies guest MEMBERS comments consistently with direct Full News', async () => {
    const post = await article('MEMBERS');
    const marker = 'D4-SYNTHETIC-MEMBERS-COMMENT-' + randomUUID();
    await app
      .get(CommentsService)
      .create(author.user.id, post.interactionTargetId, { body: marker });
    const response = await guest(commentsQuery, post);
    expect(response.errors).toBeUndefined();
    expect(response.data?.fullNews).toBeNull();
    expect(response.data?.newsComments?.total).toBe(0);
    expect(response.data?.newsComments?.items).toEqual([]);
    expect(JSON.stringify(response)).not.toContain(marker);
  });
  it('denies guest MEMBERS voting metadata consistently with direct Full News', async () => {
    const post = await article('MEMBERS');
    await app
      .get(ReactionsService)
      .set(voter.user.id, post.interactionTargetId, 'UPVOTE');
    const response = await guest(
      'query($id:ID!,$slug:String!){fullNews(language:"uk",slug:$slug){id} newsRatingVotes(articleId:$id){total items{actor{id username}}}}',
      post,
    );
    expect(response.errors).toBeUndefined();
    expect(response.data?.fullNews).toBeNull();
    expect(response.data?.newsRatingVotes?.total).toBe(0);
    expect(response.data?.newsRatingVotes?.items).toEqual([]);
    expect(JSON.stringify(response)).not.toContain(voter.user.id);
  });
  it('retains the ordinary PUBLIC guest comments control', async () => {
    const post = await article();
    const comment = await app
      .get(CommentsService)
      .create(author.user.id, post.interactionTargetId, {
        body: 'Synthetic ordinary public comment',
      });
    const response = await guest(commentsQuery, post);
    expect(response.errors).toBeUndefined();
    expect(response.data?.fullNews?.id).toBe(post.id);
    expect(response.data?.newsComments?.items[0].id).toBe(comment.id);
  });
  it('returns a nullable author-tombstoned comment without disclosing its old body', async () => {
    const post = await article();
    const marker = 'D4-SYNTHETIC-TOMBSTONE-' + randomUUID();
    const comment = await app
      .get(CommentsService)
      .create(author.user.id, post.interactionTargetId, { body: marker });
    await app
      .get(CommentsService)
      .remove(author.user.id, comment.id, 'Synthetic tombstone');
    const stored = await prisma.comment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.body).toBeNull();
    const response = await guest(commentsQuery, post);
    expect(response.errors).toBeUndefined();
    expect(response.data?.fullNews?.id).toBe(post.id);
    expect(response.data?.newsComments).toEqual({
      total: 1,
      items: [
        { id: comment.id, body: null, documentJson: null, isDeleted: true },
      ],
    });
    expect(JSON.stringify(response)).not.toContain(marker);
  });
  it.each([
    [Prisma.TransactionIsolationLevel.ReadCommitted, 'after'],
    [Prisma.TransactionIsolationLevel.RepeatableRead, 'before'],
  ] as const)(
    'observes %s owner evidence after a separately committed writer: %s',
    async (isolationLevel, expected) => {
      const post = await article();
      await prisma.user.update({
        where: { id: author.user.id },
        data: { displayName: 'before' },
      });
      const result = await prisma.$transaction(
        async (transaction) => {
          const joined = await transaction.newsArticle.findUniqueOrThrow({
            where: { id: post.id },
            select: { title: true, author: { select: { displayName: true } } },
          });
          // This writer uses an independent pooled transaction, never the reader's client.
          await prisma.$transaction([
            prisma.newsArticle.update({
              where: { id: post.id },
              data: { title: 'after' },
            }),
            prisma.user.update({
              where: { id: author.user.id },
              data: { displayName: 'after' },
            }),
          ]);
          const owner = await transaction.user.findUniqueOrThrow({
            where: { id: author.user.id },
            select: { displayName: true },
          });
          return { joined, owner };
        },
        { isolationLevel },
      );
      expect(result.joined).toEqual({
        title: post.title,
        author: { displayName: 'before' },
      });
      expect(result.owner.displayName).toBe(expected);
      expect(
        (
          await prisma.user.findUniqueOrThrow({
            where: { id: author.user.id },
            select: { displayName: true },
          })
        ).displayName,
      ).toBe('after');
    },
  );
});
