/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Security E2E
 * 📄 File: apps/api/test/news-secondary-audience.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Guards comment and vote projections with the current article audience and publication policy.
 *
 * 🧠 Responsibilities:
 * • verifies guest/member/author parity and current authentication without bypass mocks;
 * • preserves root/reply pagination, voter identities and independent feature flags;
 * • proves unavailable articles short-circuit secondary persistence and failures do not grant access.
 *
 * 🏗️ Architecture:
 * Real AppModule and owned migrated PostgreSQL schema, containing synthetic records only.
 *
 * ⚠️ Important:
 * No new ACL or role bypass; tombstone transport (DEBT-057) and snapshot transfer remain separate.
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
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsDeliveryService } from '../src/modules/news/application/services/news-delivery.service';
import { NEWS_ARTICLE_STATUSES } from '../src/modules/news/domain/types/news-article.type';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { ReactionsService } from '../src/modules/interactions/application/services/reactions.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type CommentItem = {
  id: string;
  body: string;
  documentJson: string;
  children: { id: string; body: string }[];
};
type VoteItem = {
  id: string;
  kind: 'UPVOTE' | 'DOWNVOTE';
  actor: { id: string; username: string };
};
type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
type Response = {
  errors?: { message: string }[];
  data: {
    fullNews: { id: string } | null;
    newsComments: Page<CommentItem>;
    newsRatingVotes: Page<VoteItem>;
  };
};

describe('News secondary audience (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let author: Awaited<ReturnType<typeof register>>;
  let member: Awaited<ReturnType<typeof register>>;
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
    member = await register();
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
      email: 'secondary-' + id + '@dss.test',
      username: 'secondary-' + id,
      displayName: 'Synthetic Secondary Pilot',
      password: 'synthetic-secondary-password-123',
    });
  }
  async function article(visibility: 'PUBLIC' | 'MEMBERS' = 'PUBLIC') {
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language: 'uk',
      slug: 'secondary-' + randomUUID(),
      title: 'Synthetic secondary headline',
      shortText: 'Synthetic secondary summary',
      coverMediaId: null,
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
    });
    await prisma.newsArticle.update({
      where: { id: draft.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    const marker = 'SYNTHETIC-RESTRICTED-COMMENT-' + randomUUID();
    const comment = await app
      .get(CommentsService)
      .create(author.user.id, draft.interactionTargetId, { body: marker });
    await app
      .get(ReactionsService)
      .set(member.user.id, draft.interactionTargetId, 'UPVOTE');
    return { ...draft, marker, comment };
  }
  async function read(
    post: { id: string; slug: string },
    token?: string,
    page = 1,
    pageSize = 20,
  ) {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', 'Bearer ' + token);
    const response = await call
      .send({
        query:
          'query($id:ID!,$slug:String!,$page:Int!,$pageSize:Int!){fullNews(language:"uk",slug:$slug){id} newsComments(articleId:$id,page:$page,pageSize:$pageSize){total page pageSize totalPages items{id body documentJson children{id body}}} newsRatingVotes(articleId:$id,page:$page,pageSize:$pageSize){total page pageSize totalPages items{id kind actor{id username}}}}',
        variables: { id: post.id, slug: post.slug, page, pageSize },
      })
      .expect(200);
    const body = response.body as Response;
    expect(body.errors).toBeUndefined();
    return body;
  }
  function denied(
    response: Response,
    post: { marker: string; comment: { id: string } },
    page = 1,
    pageSize = 20,
  ) {
    expect(response.data.fullNews).toBeNull();
    for (const result of [
      response.data.newsComments,
      response.data.newsRatingVotes,
    ]) {
      expect(result).toEqual({
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }
    const serialized = JSON.stringify(response);
    for (const value of [
      post.marker,
      post.comment.id,
      author.user.id,
      member.user.id,
    ]) {
      expect(serialized).not.toContain(value);
    }
  }
  it.each(['guest', 'member', 'author'] as const)(
    'retains PUBLIC comments and votes for %s',
    async (viewer) => {
      const post = await article();
      const token =
        viewer === 'guest'
          ? undefined
          : (viewer === 'author' ? author : member).tokens.accessToken;
      const response = await read(post, token);
      expect(response.data.fullNews?.id).toBe(post.id);
      expect(response.data.newsComments.total).toBe(1);
      expect(response.data.newsComments.items[0].body).toBe(post.marker);
      expect(response.data.newsRatingVotes.total).toBe(1);
      expect(response.data.newsRatingVotes.items[0].actor.id).toBe(
        member.user.id,
      );
    },
  );
  it('hides MEMBERS bodies, canonical JSON, vote identities and totals from guests on any page', async () => {
    const post = await article('MEMBERS');
    denied(await read(post, undefined, 3, 1), post, 3, 1);
  });
  it.each(['member', 'author'] as const)(
    'allows MEMBERS projections for authenticated %s without staff privileges',
    async (viewer) => {
      const post = await article('MEMBERS');
      const response = await read(
        post,
        (viewer === 'author' ? author : member).tokens.accessToken,
      );
      expect(response.data.fullNews?.id).toBe(post.id);
      expect(response.data.newsComments.items[0].body).toBe(post.marker);
      expect(response.data.newsRatingVotes.items[0].actor.id).toBe(
        member.user.id,
      );
      expect(response.data.newsRatingVotes.totalPages).toBe(1);
    },
  );
  it.each(NEWS_ARTICLE_STATUSES.filter((status) => status !== 'PUBLISHED'))(
    'denies %s to guests and even the authenticated author',
    async (status) => {
      const post = await article();
      await prisma.newsArticle.update({
        where: { id: post.id },
        data: { status },
      });
      for (const token of [undefined, author.tokens.accessToken]) {
        denied(await read(post, token), post);
      }
    },
  );
  it('denies published records missing their canonical publication time', async () => {
    const post = await article();
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { publishedAt: null },
    });
    for (const token of [undefined, member.tokens.accessToken])
      denied(await read(post, token), post);
  });
  it.each(['allowComments', 'allowRating'] as const)(
    'preserves independent %s disablement without hiding the other projection',
    async (flag) => {
      const post = await article('MEMBERS');
      await prisma.newsArticle.update({
        where: { id: post.id },
        data: { [flag]: false },
      });
      const response = await read(post, member.tokens.accessToken, 2, 1);
      expect(response.data.fullNews?.id).toBe(post.id);
      const disabled =
        flag === 'allowComments'
          ? response.data.newsComments
          : response.data.newsRatingVotes;
      const enabled =
        flag === 'allowComments'
          ? response.data.newsRatingVotes
          : response.data.newsComments;
      expect(disabled).toEqual({
        items: [],
        total: 0,
        page: 2,
        pageSize: 1,
        totalPages: 0,
      });
      expect(enabled).toEqual({
        items: [],
        total: 1,
        page: 2,
        pageSize: 1,
        totalPages: 1,
      });
    },
  );
  it('preserves root/reply and voter page totals/order including out-of-range pages', async () => {
    const post = await article('MEMBERS');
    const comments = app.get(CommentsService);
    const reply = await comments.create(
      member.user.id,
      post.interactionTargetId,
      { body: 'Synthetic reply' },
      post.comment.id,
    );
    const second = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic second root' },
    );
    // Preserve immutable identity timestamps; the ID tie-breaker handles equal creation times.
    const rootOrder = [post.comment, second].sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id.localeCompare(left.id),
    );
    await app
      .get(ReactionsService)
      .set(author.user.id, post.interactionTargetId, 'DOWNVOTE');
    await prisma.reaction.updateMany({
      where: {
        actorId: member.user.id,
        interactionTargetId: post.interactionTargetId,
      },
      data: { updatedAt: new Date('2026-01-01') },
    });
    const first = await read(post, member.tokens.accessToken, 1, 1);
    const next = await read(post, member.tokens.accessToken, 2, 1);
    const outside = await read(post, member.tokens.accessToken, 3, 1);
    expect(first.data.newsComments.items[0].id).toBe(rootOrder[0].id);
    expect(next.data.newsComments.items[0].id).toBe(rootOrder[1].id);
    const parent = [first, next]
      .flatMap((response) => response.data.newsComments.items)
      .find((item) => item.id === post.comment.id);
    expect(parent?.children).toEqual([
      { id: reply.id, body: 'Synthetic reply' },
    ]);
    expect(first.data.newsRatingVotes.items[0]).toEqual(
      expect.objectContaining({
        kind: 'DOWNVOTE',
        actor: { id: author.user.id, username: author.user.username },
      }),
    );
    expect(next.data.newsRatingVotes.items[0].actor.id).toBe(member.user.id);
    for (const response of [first, next, outside]) {
      for (const result of [
        response.data.newsComments,
        response.data.newsRatingVotes,
      ]) {
        expect(result.total).toBe(2);
        expect(result.totalPages).toBe(2);
      }
    }
    expect(outside.data.newsComments.items).toEqual([]);
    expect(outside.data.newsRatingVotes.items).toEqual([]);
  });
  it('rechecks visibility on the next request without positive-grant caching', async () => {
    const post = await article();
    expect((await read(post)).data.newsComments.total).toBe(1);
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { visibility: 'MEMBERS' },
    });
    denied(await read(post), post);
    expect(
      (await read(post, member.tokens.accessToken)).data.newsRatingVotes.total,
    ).toBe(1);
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: { visibility: 'PUBLIC' },
    });
    expect((await read(post)).data.newsRatingVotes.total).toBe(1);
  });
  it('treats invalid JWTs as guests rather than evidence of MEMBERS access', async () => {
    const post = await article('MEMBERS');
    denied(await read(post, 'synthetic-invalid-token'), post);
  });
  it('rechecks revoked sessions on the next request', async () => {
    const post = await article('MEMBERS');
    const temporary = await register();
    expect(
      (await read(post, temporary.tokens.accessToken)).data.newsComments.total,
    ).toBe(1);
    await prisma.session.updateMany({
      where: { userId: temporary.user.id },
      data: { revokedAt: new Date() },
    });
    denied(await read(post, temporary.tokens.accessToken), post);
  });
  it('does not query interactions when the article is inaccessible or missing', async () => {
    const post = await article('MEMBERS');
    const commentRows = jest.spyOn(prisma.comment, 'findMany');
    const commentCount = jest.spyOn(prisma.comment, 'count');
    const reactionRows = jest.spyOn(prisma.reaction, 'findMany');
    const reactionCount = jest.spyOn(prisma.reaction, 'count');
    denied(await read(post), post);
    denied(
      await read({ ...post, id: randomUUID(), slug: 'synthetic-missing' }),
      post,
    );
    for (const query of [
      commentRows,
      commentCount,
      reactionRows,
      reactionCount,
    ])
      expect(query).not.toHaveBeenCalled();
  });
  it('propagates failed eligibility reads without falling through to interactions', async () => {
    const post = await article('MEMBERS');
    const rows = jest.spyOn(prisma.comment, 'findMany');
    const votes = jest.spyOn(prisma.reaction, 'findMany');
    const eligibility = jest.spyOn(prisma.newsArticle, 'findFirst');
    const failure = new Error('Synthetic eligibility store unavailable');
    const delivery = app.get(NewsDeliveryService);
    eligibility.mockRejectedValueOnce(failure);
    await expect(delivery.comments(post.id, 1, 20)).rejects.toBe(failure);
    eligibility.mockRejectedValueOnce(failure);
    await expect(delivery.ratingVotes(post.id, 1, 20)).rejects.toBe(failure);
    expect(rows).not.toHaveBeenCalled();
    expect(votes).not.toHaveBeenCalled();
  });
});
