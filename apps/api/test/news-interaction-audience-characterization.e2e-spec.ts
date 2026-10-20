/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Interaction Audit
 * 📄 File: apps/api/test/news-interaction-audience-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Compares article delivery eligibility with shared engagement routes.
 *
 * 🧠 Responsibilities:
 * • publishes synthetic articles through the real editorial workflow;
 * • uses actual JWT/session state and verifies persisted guest effects;
 * • characterizes divergence without changing production authorization.
 *
 * 🏗️ Architecture:
 * Audit-only AppModule HTTP tests in an owned fully migrated schema.
 *
 * ⚠️ Important:
 * Passing defect assertions are not security acceptance. No access grants are mocked.
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
import { Permission } from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsWorkflowService } from '../src/modules/news/application/services/news-workflow.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Result<T> = { errors?: { message: string }[]; data: T | null };
type Engagement = { changed: boolean; viewCount: number; shareCount: number };

describe('News interaction audience characterization (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let author: Awaited<ReturnType<typeof register>>;
  let reviewer: Awaited<ReturnType<typeof register>>;
  let member: Awaited<ReturnType<typeof register>>;
  const presenceWrites: Promise<void>[] = [];

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    author = await register();
    reviewer = await register();
    member = await register();
    // Authoritative IAM fixture grants only editorial review/publication.
    for (const key of [Permission.NewsReview, Permission.NewsPublish]) {
      const permission = await fixture.prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      });
      await fixture.prisma.userPermission.create({
        data: { userId: reviewer.user.id, permissionId: permission.id },
      });
    }
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
    try {
      await app?.close();
    } finally {
      await fixture?.close();
    }
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      username: `audience-${id}`,
      email: `${id}@dss.test`,
      password: 'synthetic-audience-password-123',
    });
  }
  async function article(visibility: 'PUBLIC' | 'MEMBERS', publish = true) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Synthetic audience body.' }],
      },
    ];
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language: 'uk',
      slug: `audience-${randomUUID()}`,
      title: 'Synthetic audience headline',
      shortText: 'Synthetic audience description',
      documentJson: JSON.stringify(document),
      // Opaque synthetic cover coordinate: media processing is not under test.
      coverMediaId: randomUUID(),
    });
    if (!publish) return draft;
    const workflow = app.get(NewsWorkflowService);
    await workflow.submit(author.user.id, draft.id);
    await workflow.approve(reviewer.user.id, draft.id);
    const result = await workflow.publish(reviewer.user.id, draft.id);
    expect(result.article.publishedAt).not.toBeNull();
    expect(result.article.approvedVersion).toBe(result.article.currentVersion);
    return result.article;
  }
  async function graphql<T>(
    query: string,
    variables: Record<string, unknown>,
    token?: string,
  ): Promise<Result<T>> {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', `Bearer ${token}`);
    const response = await call.send({ query, variables }).expect(200);
    return response.body as Result<T>;
  }
  async function full(slug: string, token?: string) {
    const result = await graphql<{ fullNews: { id: string } | null }>(
      'query($slug:String!){fullNews(language:"uk",slug:$slug){id}}',
      { slug },
      token,
    );
    expect(result.errors).toBeUndefined();
    return result.data?.fullNews;
  }
  function engage(
    kind: 'View' | 'Share',
    targetId: string,
    token?: string,
    visitorId = randomUUID(),
  ) {
    const channel = kind === 'Share' ? ', channel: COPY_LINK' : '';
    return graphql<{ result: Engagement }>(
      `mutation($targetId:ID!,$visitorId:String!){result:recordInteraction${kind}(input:{interactionTargetId:$targetId,visitorId:$visitorId${channel}}){changed viewCount shareCount}}`,
      { targetId, visitorId },
      token,
    );
  }
  it('retains PUBLIC guest engagement and per-visitor idempotency', async () => {
    const post = await article('PUBLIC');
    expect(await full(post.slug)).toEqual({ id: post.id });
    const visitor = randomUUID();
    const first = await engage(
      'View',
      post.interactionTargetId,
      undefined,
      visitor,
    );
    expect(first.errors).toBeUndefined();
    expect(first.data?.result).toEqual({
      changed: true,
      viewCount: 1,
      shareCount: 0,
    });
    expect(
      (await engage('View', post.interactionTargetId, undefined, visitor)).data
        ?.result.changed,
    ).toBe(false);
    expect(
      (await engage('Share', post.interactionTargetId)).data?.result.shareCount,
    ).toBe(1);
  });
  it('allows a current authenticated member to view and engage MEMBERS News', async () => {
    const post = await article('MEMBERS');
    expect(await full(post.slug, member.tokens.accessToken)).toEqual({
      id: post.id,
    });
    expect(
      (
        await engage(
          'View',
          post.interactionTargetId,
          member.tokens.accessToken,
        )
      ).data?.result.changed,
    ).toBe(true);
    expect(
      (
        await engage(
          'Share',
          post.interactionTargetId,
          member.tokens.accessToken,
        )
      ).data?.result.changed,
    ).toBe(true);
  });
  it.each(['guest', 'invalid-token', 'revoked-session'] as const)(
    'characterizes %s writing and reading engagement for inaccessible MEMBERS News',
    async (viewer) => {
      const post = await article('MEMBERS');
      let token: string | undefined;
      if (viewer === 'invalid-token') token = 'synthetic-invalid-token';
      if (viewer === 'revoked-session') {
        const revoked = await register();
        token = revoked.tokens.accessToken;
        await fixture.prisma.session.updateMany({
          where: { userId: revoked.user.id },
          data: { revokedAt: new Date() },
        });
      }
      await engage('View', post.interactionTargetId, member.tokens.accessToken);
      await engage(
        'Share',
        post.interactionTargetId,
        member.tokens.accessToken,
      );
      expect(await full(post.slug, token)).toBeNull();
      const view = await engage('View', post.interactionTargetId, token);
      const share = await engage('Share', post.interactionTargetId, token);
      expect(view.errors).toBeUndefined();
      expect(share.errors).toBeUndefined();
      // Defect characterization, not the intended access contract.
      expect(view.data?.result).toEqual({
        changed: true,
        viewCount: 2,
        shareCount: 1,
      });
      expect(share.data?.result).toEqual({
        changed: true,
        viewCount: 2,
        shareCount: 2,
      });
      expect(
        await fixture.prisma.interactionView.count({
          where: {
            interactionTargetId: post.interactionTargetId,
            actorId: null,
          },
        }),
      ).toBe(1);
      expect(
        await fixture.prisma.interactionShare.count({
          where: {
            interactionTargetId: post.interactionTargetId,
            actorId: null,
          },
        }),
      ).toBe(1);
    },
  );
  it('characterizes the same ancestor-policy gap for a MEMBERS comment target', async () => {
    const post = await article('MEMBERS');
    const comment = await app
      .get(CommentsService)
      .create(author.user.id, post.interactionTargetId, {
        body: 'Synthetic hidden comment',
      });
    const page = await graphql<{
      newsComments: { total: number; items: { id: string }[] };
    }>('query($id:ID!){newsComments(articleId:$id){total items{id}}}', {
      id: post.id,
    });
    expect(page.errors).toBeUndefined();
    expect(page.data?.newsComments).toEqual({ total: 0, items: [] });
    const result = await engage('View', comment.reactionTargetId);
    expect(result.errors).toBeUndefined();
    expect(result.data?.result).toEqual({
      changed: true,
      viewCount: 1,
      shareCount: 0,
    });
  });
  it('still denies unpublished articles and disabled sharing', async () => {
    const draft = await article('PUBLIC', false);
    expect(
      (await engage('View', draft.interactionTargetId)).errors,
    ).toBeDefined();
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: draft.interactionTargetId },
      }),
    ).toBe(0);
    const post = await article('PUBLIC');
    await fixture.prisma.newsArticle.update({
      where: { id: post.id },
      data: { allowSharing: false },
    });
    expect(
      (await engage('Share', post.interactionTargetId)).errors,
    ).toBeDefined();
    expect(
      await fixture.prisma.interactionShare.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(0);
  });
  it('characterizes publication-time drift separately from a normal workflow row', async () => {
    const post = await article('PUBLIC');
    // Deliberately corrupted/imported state; no public way to create it is claimed.
    await fixture.prisma.newsArticle.update({
      where: { id: post.id },
      data: { publishedAt: null },
    });
    expect(await full(post.slug)).toBeNull();
    expect(
      (await engage('View', post.interactionTargetId)).data?.result.changed,
    ).toBe(true);
  });
});
